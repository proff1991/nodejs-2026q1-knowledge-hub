import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";

var connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}

var pool = new Pool({ connectionString });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });

var main = async () => {
    await prisma.comment.deleteMany();
    await prisma.article.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tag.deleteMany();

    var saltRounds = Number(process.env.CRYPT_SALT ?? 10);
    var adminPasswordHash = await bcrypt.hash("admin123", saltRounds);
    var editorPasswordHash = await bcrypt.hash("editor123", saltRounds);

    var admin = await prisma.user.create({
        data: {
            login: "admin",
            password: adminPasswordHash,
            role: "ADMIN",
        },
    });

    var editor = await prisma.user.create({
        data: {
            login: "editor",
            password: editorPasswordHash,
            role: "EDITOR",
        },
    });

    var categoryNode = await prisma.category.create({
        data: {
            name: "Node.js",
            description: "Articles about Node.js backend development",
        },
    });

    var categoryNest = await prisma.category.create({
        data: {
            name: "NestJS",
            description: "Articles about NestJS architecture and modules",
        },
    });

    var categoryDatabase = await prisma.category.create({
        data: {
            name: "Databases",
            description: "Articles about SQL, PostgreSQL and ORM tools",
        },
    });

    await prisma.tag.createMany({
        data: [
            { name: "nodejs" },
            { name: "nestjs" },
            { name: "postgres" },
            { name: "prisma" },
            { name: "typescript" },
        ],
    });

    var article1 = await prisma.article.create({
        data: {
            title: "Getting started with Node.js",
            content: "Introduction to backend development with Node.js.",
            status: "PUBLISHED",
            author: {
                connect: { id: admin.id },
            },
            category: {
                connect: { id: categoryNode.id },
            },
            tags: {
                connect: [{ name: "nodejs" }, { name: "typescript" }],
            },
        },
    });

    var article2 = await prisma.article.create({
        data: {
            title: "NestJS modules explained",
            content: "How modules help structure large NestJS applications.",
            status: "DRAFT",
            author: {
                connect: { id: editor.id },
            },
            category: {
                connect: { id: categoryNest.id },
            },
            tags: {
                connect: [{ name: "nestjs" }, { name: "typescript" }],
            },
        },
    });

    var article3 = await prisma.article.create({
        data: {
            title: "Prisma with PostgreSQL",
            content: "Using Prisma ORM with PostgreSQL in a Dockerized setup.",
            status: "PUBLISHED",
            author: {
                connect: { id: admin.id },
            },
            category: {
                connect: { id: categoryDatabase.id },
            },
            tags: {
                connect: [{ name: "prisma" }, { name: "postgres" }],
            },
        },
    });

    var article4 = await prisma.article.create({
        data: {
            title: "Advanced PostgreSQL basics",
            content: "Important PostgreSQL concepts for backend developers.",
            status: "ARCHIVED",
            author: {
                connect: { id: editor.id },
            },
            category: {
                connect: { id: categoryDatabase.id },
            },
            tags: {
                connect: [{ name: "postgres" }],
            },
        },
    });

    var article5 = await prisma.article.create({
        data: {
            title: "TypeScript in backend services",
            content: "Why TypeScript improves maintainability in backend projects.",
            status: "DRAFT",
            author: {
                connect: { id: admin.id },
            },
            category: {
                connect: { id: categoryNode.id },
            },
            tags: {
                connect: [{ name: "typescript" }, { name: "nodejs" }],
            },
        },
    });

    await prisma.comment.createMany({
        data: [
            {
                content: "Very useful introduction.",
                articleId: article1.id,
                authorId: editor.id,
            },
            {
                content: "This helped me understand Prisma better.",
                articleId: article3.id,
                authorId: admin.id,
            },
            {
                content: "Please add more details about modules.",
                articleId: article2.id,
                authorId: admin.id,
            },
        ],
    });

    console.log("Seed completed successfully");
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