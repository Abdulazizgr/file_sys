import fs from "fs";
import path from "path";

type Metadata = Record<string, number>;
interface DataBaseSchema {
  idNum: number;
  metadata: Metadata;
  data: Record<string, any>;
}

type DataSchema<T> = {
  [key in keyof T]: string;
};

// This is the main class that handles the database operations
class FileDb<T extends Metadata> {
  constructor(private pathName: string, private schema: Metadata) {
    if (!fs.existsSync(this.pathName)) {
      const initial: DataBaseSchema = {
        idNum: 0,
        metadata: this.schema,
        data: {},
      };
      fs.writeFileSync(this.pathName, JSON.stringify(initial, null, 2));
    }
  }

  private readData(): DataBaseSchema {
    const data = fs.readFileSync(this.pathName, "utf-8");
    return JSON.parse(data) as DataBaseSchema;
  }

  private writeData(data: DataBaseSchema): void {
    fs.writeFileSync(this.pathName, JSON.stringify(data, null, 2));
  }
  // This method transforms the data for writing
  private transformForWrite(data: Partial<DataSchema<T>>) {
    const dbData = this.readData();
    const transformedData: Record<string, any> = {};
    Object.entries(dbData.metadata).forEach(([key, val]) => {
      if (key !== "id" && data[key] !== undefined) {
        transformedData[val] = data[key];
      }
    });
    return transformedData;
  }

  // This method transforms the data for reading
  private transformForRead(data: DataSchema<T>) {
    const dbData = this.readData();
    const transformedData: Record<string, any> = {};
    Object.entries(dbData.metadata).map(([key, val]) => {
      transformedData[key] = data[val];
    });
    return transformedData;
  }

  // This method creates a new entry in the database
  async create(data: Omit<DataSchema<T>, "id">): Promise<DataSchema<T>> {
    const dbData = this.readData();
    const entry: Record<string, any> = {} as DataSchema<T>;
    Object.entries(dbData.metadata).map(([key, val]) => {
      entry[val] =
        key === "id" ? (data[key] ? data[val] : dbData.idNum) : data[key];
    });

    dbData.data[dbData.idNum] = entry;
    dbData.idNum += 1;
    this.writeData(dbData);
    return entry as DataSchema<T>;
  }

  // This method returns all the entries in the database
  async findMany(): Promise<Record<string, any>[]> {
    const dbData = this.readData();
    const entries: Record<string, any>[] = [];

    for (const key in dbData.data) {
      const entry: Record<string, any> = this.transformForRead(
        dbData.data[key] as DataSchema<T>
      );

      entries.push(entry);
    }
    return entries;
  }

  // This method returns a single entry in the database
  async findOne(id: string): Promise<Record<string, any>> {
    const dbData = this.readData();
    const data = dbData.data[id];
    if (!data) {
      throw new Error("User not found");
    }
    const entry: Record<string, any> = this.transformForRead(
      data as DataSchema<T>
    );

    return entry;
  }

  // This method updates a single entry in the database
  async update(
    id: string,
    data: Partial<DataSchema<T>>
  ): Promise<Record<string, any>> {
    const dbData = this.readData();
    const entry: DataSchema<T> = dbData.data[id];
    if (!entry) {
      throw new Error("User not found");
    }
    const transformedData: Record<string, any> = this.transformForWrite(data);
    const updatedEntry: Record<string, any> = { ...entry };
    Object.entries(transformedData).forEach(([key, val]) => {
      updatedEntry[key] = val;
    });
    dbData.data[id] = updatedEntry;
    this.writeData(dbData);

    return updatedEntry as DataSchema<T>;
  }

  // This method deletes a single entry in the database
  async delete(id: string): Promise<void> {
    const dbData = this.readData();
    if (!dbData.data[id]) {
      throw new Error("User not found");
    }
    delete dbData.data[id];
    this.writeData(dbData);
  }
}

// This is the main function that runs the example
async function main() {
  const schema = {
    id: 0,
    name: 1,
    email: 2,
    age: 3,
  };
  const pathName = path.join(__dirname, "data", "data.json");
  const db = new FileDb(pathName, schema);

  const user = await db.create({
    name: "John Doe",
    email: "email1@gmail.com",
    age: "30",
  });
  const user1 = await db.create({
    name: "Jane Smith",
    email: "email2@gmail.com",
    age: "25",
  });
  const user2 = await db.create({
    name: "Alice Johnson",
    email: "email3@gmail.com",
    age: "28",
  });
  const user3 = await db.create({
    name: "Bob Brown",
    email: "email1@gmail.com",
    age: "35",
  });

  const allUsers = await db.findMany();
  console.log("All Users:");
  console.log(allUsers);
  const UserOne = await db.findOne("1");
  console.log("User with ID 1:");
  console.log(UserOne);
  const updatedUser = await db.update("1", {
    name: "John Smith",
    email: "test@gmail.com",
  });
  console.log("Updated user:");
  console.log(updatedUser);
  const allUsers1 = await db.findMany();
  console.log("All Users:");
  console.log(allUsers1);
  const deleted = await db.delete("2");
  console.log("Deleted user with ID 2");
  const allUsers2 = await db.findMany();
  console.log("All Users:");
  console.log(allUsers2);
}

main();
