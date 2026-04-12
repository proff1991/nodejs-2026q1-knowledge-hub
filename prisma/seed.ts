import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

var connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}

var pool = new Pool({ connectionString });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });

var main = async () => {
    var admin = await prisma.user.upsert({
        where: { login: "admin" },
        update: {},
        create: {
            login: "admin",
            password: "admin123",
            role: "ADMIN",
        },
    });

    var editor = await prisma.user.upsert({
        where: { login: "editor" },
        update: {},
        create: {
            login: "editor",
            password: "editor123",
            role: "EDITOR",
        },
    });

    console.log({ admin, editor });
};

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });