import { Contact, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { prisma } from "@formbricks/database";
import { DatabaseError, ValidationError } from "@formbricks/types/errors";
import {
  buildContactWhereClause,
  createContactsFromCSV,
  deleteContact,
  generatePersonalLinks,
  getContact,
  getContacts,
  getContactsInSegment,
} from "./contacts";

// Mock additional dependencies for the new functions
vi.mock("@/modules/ee/contacts/segments/lib/segments", () => ({
  getSegment: vi.fn(),
}));

vi.mock("@/modules/ee/contacts/segments/lib/filter/prisma-query", () => ({
  segmentFilterToPrismaQuery: vi.fn(),
}));

vi.mock("@/modules/ee/contacts/lib/contact-survey-link", () => ({
  getContactSurveyLink: vi.fn(),
}));

vi.mock("@formbricks/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@formbricks/database", () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    contactAttribute: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    contactAttributeKey: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/constants", () => ({
  ITEMS_PER_PAGE: 2,
  ENCRYPTION_KEY: "test-encryption-key-32-chars-long!",
  IS_PRODUCTION: false,
  IS_POSTHOG_CONFIGURED: false,
  POSTHOG_API_HOST: "test-posthog-host",
  POSTHOG_API_KEY: "test-posthog-key",
}));

const environmentId = "cm123456789012345678901237";
const contactId = "cm123456789012345678901238";
const userId = "cm123456789012345678901239";
const mockContact: Contact & {
  attributes: { value: string; attributeKey: { key: string; name: string } }[];
} = {
  id: contactId,
  createdAt: new Date(),
  updatedAt: new Date(),
  environmentId,
  userId,
  attributes: [
    { value: "john@example.com", attributeKey: { key: "email", name: "Email" } },
    { value: "John", attributeKey: { key: "name", name: "Name" } },
    { value: userId, attributeKey: { key: "userId", name: "User ID" } },
  ],
};

describe("getContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns contacts with attributes", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContact]);
    const result = await getContacts(environmentId, 0, "");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(contactId);
    expect(result[0].attributes.email).toBe("john@example.com");
  });

  test("returns empty array if no contacts", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    const result = await getContacts(environmentId, 0, "");
    expect(result).toEqual([]);
  });

  test("throws DatabaseError on Prisma error", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("DB error", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    vi.mocked(prisma.contact.findMany).mockRejectedValue(prismaError);
    await expect(getContacts(environmentId, 0, "")).rejects.toThrow(DatabaseError);
  });

  test("throws original error on unknown error", async () => {
    const genericError = new Error("Unknown error");
    vi.mocked(prisma.contact.findMany).mockRejectedValue(genericError);
    await expect(getContacts(environmentId, 0, "")).rejects.toThrow(genericError);
  });
});

describe("getContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns contact if found", async () => {
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact);
    const result = await getContact(contactId);
    expect(result).toEqual(mockContact);
  });

  test("returns null if not found", async () => {
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);
    const result = await getContact(contactId);
    expect(result).toBeNull();
  });

  test("throws DatabaseError on Prisma error", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("DB error", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    vi.mocked(prisma.contact.findUnique).mockRejectedValue(prismaError);
    await expect(getContact(contactId)).rejects.toThrow(DatabaseError);
  });

  test("throws original error on unknown error", async () => {
    const genericError = new Error("Unknown error");
    vi.mocked(prisma.contact.findUnique).mockRejectedValue(genericError);
    await expect(getContact(contactId)).rejects.toThrow(genericError);
  });
});

describe("deleteContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes contact and revalidates caches", async () => {
    vi.mocked(prisma.contact.delete).mockResolvedValue(mockContact);
    const result = await deleteContact(contactId);
    expect(result).toEqual(mockContact);
  });

  test("throws DatabaseError on Prisma error", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("DB error", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    vi.mocked(prisma.contact.delete).mockRejectedValue(prismaError);
    await expect(deleteContact(contactId)).rejects.toThrow(DatabaseError);
  });

  test("throws original error on unknown error", async () => {
    const genericError = new Error("Unknown error");
    vi.mocked(prisma.contact.delete).mockRejectedValue(genericError);
    await expect(deleteContact(contactId)).rejects.toThrow(genericError);
  });
});

describe("createContactsFromCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates new contacts and missing attribute keys", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { key: "email", id: "id-email" },
        { key: "name", id: "id-name" },
      ] as any);
    vi.mocked(prisma.contactAttributeKey.createMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.contact.create).mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "name" }, value: "John" },
      ],
    } as any);
    const csvData = [{ email: "john@example.com", name: "John" }];
    const result = await createContactsFromCSV(csvData, environmentId, "skip", {
      email: "email",
      name: "name",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe("c1");
  });

  test("skips duplicate contact with 'skip' action", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      { id: "c1", attributes: [{ attributeKey: { key: "email" }, value: "john@example.com" }] },
    ] as any);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "name", id: "id-name" },
    ] as any);
    const csvData = [{ email: "john@example.com", name: "John" }];
    const result = await createContactsFromCSV(csvData, environmentId, "skip", {
      email: "email",
      name: "name",
    });
    expect(result).toEqual([]);
  });

  test("updates contact with 'update' action", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      {
        id: "c1",
        attributes: [
          { attributeKey: { key: "email" }, value: "john@example.com" },
          { attributeKey: { key: "name" }, value: "Old" },
        ],
      },
    ] as any);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "name", id: "id-name" },
    ] as any);
    vi.mocked(prisma.contact.update).mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "name" }, value: "John" },
      ],
    } as any);
    const csvData = [{ email: "john@example.com", name: "John" }];
    const result = await createContactsFromCSV(csvData, environmentId, "update", {
      email: "email",
      name: "name",
    });
    expect(result[0].id).toBe("c1");
  });

  test("overwrites contact with 'overwrite' action", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      {
        id: "c1",
        attributes: [
          { attributeKey: { key: "email" }, value: "john@example.com" },
          { attributeKey: { key: "name" }, value: "Old" },
        ],
      },
    ] as any);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "name", id: "id-name" },
    ] as any);
    vi.mocked(prisma.contactAttribute.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.contact.update).mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "name" }, value: "John" },
      ],
    } as any);
    const csvData = [{ email: "john@example.com", name: "John" }];
    const result = await createContactsFromCSV(csvData, environmentId, "overwrite", {
      email: "email",
      name: "name",
    });
    expect(result[0].id).toBe("c1");
  });

  test("throws ValidationError if email is missing in CSV", async () => {
    const csvData = [{ name: "John" }];
    await expect(
      createContactsFromCSV(csvData as any, environmentId, "skip", { name: "name" })
    ).rejects.toThrow(ValidationError);
  });

  test("throws DatabaseError on Prisma error", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("DB error", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    vi.mocked(prisma.contact.findMany).mockRejectedValue(prismaError);
    const csvData = [{ email: "john@example.com", name: "John" }];
    await expect(
      createContactsFromCSV(csvData, environmentId, "skip", { email: "email", name: "name" })
    ).rejects.toThrow(DatabaseError);
  });

  test("throws original error on unknown error", async () => {
    const genericError = new Error("Unknown error");
    vi.mocked(prisma.contact.findMany).mockRejectedValue(genericError);
    const csvData = [{ email: "john@example.com", name: "John" }];
    await expect(
      createContactsFromCSV(csvData, environmentId, "skip", { email: "email", name: "name" })
    ).rejects.toThrow(genericError);
  });

  test("handles language attribute key like other default attributes", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "userId", id: "id-userId" },
      { key: "firstName", id: "id-firstName" },
      { key: "lastName", id: "id-lastName" },
      { key: "language", id: "id-language" },
    ] as any);
    vi.mocked(prisma.contact.create).mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "userId" }, value: "user123" },
        { attributeKey: { key: "firstName" }, value: "John" },
        { attributeKey: { key: "lastName" }, value: "Doe" },
        { attributeKey: { key: "language" }, value: "en" },
      ],
    } as any);
    const csvData = [
      {
        email: "john@example.com",
        userId: "user123",
        firstName: "John",
        lastName: "Doe",
        language: "en",
      },
    ];
    const result = await createContactsFromCSV(csvData, environmentId, "skip", {
      email: "email",
      userId: "userId",
      firstName: "firstName",
      lastName: "lastName",
      language: "language",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe("c1");
    // language attribute key should already exist, no need to create it
    expect(prisma.contactAttributeKey.createMany).not.toHaveBeenCalled();
  });

  test("filters out empty values when creating contacts", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "name", id: "id-name" },
      { key: "company", id: "id-company" },
    ] as any);

    const mockCreate = vi.fn().mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "name" }, value: "John" },
      ],
    } as any);
    vi.mocked(prisma.contact.create).mockImplementation(mockCreate);

    const csvData = [
      {
        email: "john@example.com",
        name: "John",
        company: "", // Empty value should be filtered out
      },
    ];

    await createContactsFromCSV(csvData, environmentId, "skip", {
      email: "email",
      name: "name",
      company: "company",
    });

    // Verify that the create was called with only non-empty attributes
    expect(mockCreate).toHaveBeenCalled();
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.attributes.create).toHaveLength(2); // Only email and name, not company
    expect(
      createCall.data.attributes.create.some(
        (attr: any) => attr.attributeKey.connect.key_environmentId.key === "company"
      )
    ).toBe(false);
  });

  test("filters out whitespace-only values when creating contacts", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
      { key: "name", id: "id-name" },
      { key: "title", id: "id-title" },
    ] as any);

    const mockCreate = vi.fn().mockResolvedValue({
      id: "c1",
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [
        { attributeKey: { key: "email" }, value: "john@example.com" },
        { attributeKey: { key: "name" }, value: "John" },
      ],
    } as any);
    vi.mocked(prisma.contact.create).mockImplementation(mockCreate);

    const csvData = [
      {
        email: "john@example.com",
        name: "John",
        title: "   ", // Whitespace-only value should be filtered out
      },
    ];

    await createContactsFromCSV(csvData, environmentId, "skip", {
      email: "email",
      name: "name",
      title: "title",
    });

    // Verify that the create was called with only non-empty attributes
    expect(mockCreate).toHaveBeenCalled();
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.attributes.create).toHaveLength(2); // Only email and name, not title
  });

  test("throws ValidationError for empty attribute key names", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
    ] as any);

    const csvData = [
      {
        email: "john@example.com",
        "   ": "value", // Whitespace-only attribute key
      },
    ];

    await expect(
      createContactsFromCSV(csvData, environmentId, "skip", { email: "email", "   ": "   " })
    ).rejects.toThrow(ValidationError);
    await expect(
      createContactsFromCSV(csvData, environmentId, "skip", { email: "email", "   ": "   " })
    ).rejects.toThrow("empty or whitespace-only keys are not allowed");
  });

  test("throws ValidationError for attribute keys exceeding 255 characters", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contactAttribute.findMany).mockResolvedValue([]);
    // Mock only email key exists, so the long key will be detected as missing
    vi.mocked(prisma.contactAttributeKey.findMany).mockResolvedValue([
      { key: "email", id: "id-email" },
    ] as any);

    const longKey = "a".repeat(256);
    const csvData = [
      {
        email: "john@example.com",
        [longKey]: "value",
      },
    ];

    // The validation happens before createMany, so we don't need to mock it
    await expect(createContactsFromCSV(csvData, environmentId, "skip", { email: "email" })).rejects.toThrow(
      ValidationError
    );
    await expect(createContactsFromCSV(csvData, environmentId, "skip", { email: "email" })).rejects.toThrow(
      "keys must be 255 characters or less"
    );
  });
});

describe("buildContactWhereClause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns where clause for email", () => {
    const environmentId = "env-1";
    const search = "john";
    const result = buildContactWhereClause(environmentId, search);
    expect(result).toEqual({
      environmentId,
      OR: [
        {
          attributes: {
            some: {
              value: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          id: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    });
  });

  test("returns where clause without search", () => {
    const environmentId = "cm123456789012345678901240";
    const result = buildContactWhereClause(environmentId);
    expect(result).toEqual({ environmentId });
  });
});

describe("getContactsInSegment", () => {
  const mockSegmentId = "cm123456789012345678901235";
  const mockEnvironmentId = "cm123456789012345678901236";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns contacts when segment and filters are valid", async () => {
    const mockSegment = {
      id: mockSegmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      environmentId: mockEnvironmentId,
      description: "Test segment",
      title: "Test Segment",
      isPrivate: false,
      surveys: [],
      filters: [],
    };

    const mockContacts = [
      {
        id: "contact-1",
        attributes: [
          { attributeKey: { key: "email" }, value: "test@example.com" },
          { attributeKey: { key: "name" }, value: "Test User" },
        ],
      },
      {
        id: "contact-2",
        attributes: [
          { attributeKey: { key: "email" }, value: "another@example.com" },
          { attributeKey: { key: "name" }, value: "Another User" },
        ],
      },
    ] as any;

    const mockWhereClause = {
      environmentId: mockEnvironmentId,
      attributes: {
        some: {
          attributeKey: { key: "email" },
          value: "test@example.com",
        },
      },
    };

    // Mock the dependencies
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");
    const { segmentFilterToPrismaQuery } = await import(
      "@/modules/ee/contacts/segments/lib/filter/prisma-query"
    );

    vi.mocked(getSegment).mockResolvedValue(mockSegment);

    vi.mocked(segmentFilterToPrismaQuery).mockResolvedValue({
      ok: true,
      data: { whereClause: mockWhereClause },
    } as any);

    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts);

    const result = await getContactsInSegment(mockSegmentId);

    expect(result).toEqual([
      {
        contactId: "contact-1",
        attributes: {
          email: "test@example.com",
          name: "Test User",
        },
      },
      {
        contactId: "contact-2",
        attributes: {
          email: "another@example.com",
          name: "Another User",
        },
      },
    ]);

    expect(prisma.contact.findMany).toHaveBeenCalledWith({
      where: mockWhereClause,
      select: {
        id: true,
        attributes: {
          where: {
            attributeKey: {
              key: {
                in: ["userId", "firstName", "lastName", "email"],
              },
            },
          },
          select: {
            attributeKey: {
              select: {
                key: true,
              },
            },
            value: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("returns null when segment is not found", async () => {
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");

    vi.mocked(getSegment).mockRejectedValue(new Error("Segment not found"));

    const result = await getContactsInSegment(mockSegmentId);

    expect(result).toBeNull();
  });

  test("returns null when segment filter to prisma query fails", async () => {
    const mockSegment = {
      id: mockSegmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      environmentId: mockEnvironmentId,
      description: "Test segment",
      title: "Test Segment",
      isPrivate: false,
      surveys: [],
      filters: [],
    };

    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");
    const { segmentFilterToPrismaQuery } = await import(
      "@/modules/ee/contacts/segments/lib/filter/prisma-query"
    );

    vi.mocked(getSegment).mockResolvedValue(mockSegment);

    vi.mocked(segmentFilterToPrismaQuery).mockResolvedValue({
      ok: false,
      error: { type: "bad_request" },
    } as any);

    const result = await getContactsInSegment(mockSegmentId);

    expect(result).toBeNull();
  });

  test("returns null when prisma query fails", async () => {
    const mockSegment = {
      id: mockSegmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      environmentId: mockEnvironmentId,
      description: "Test segment",
      title: "Test Segment",
      isPrivate: false,
      surveys: [],
      filters: [],
    };

    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");
    const { segmentFilterToPrismaQuery } = await import(
      "@/modules/ee/contacts/segments/lib/filter/prisma-query"
    );

    vi.mocked(getSegment).mockResolvedValue(mockSegment);

    vi.mocked(segmentFilterToPrismaQuery).mockResolvedValue({
      ok: true,
      data: { whereClause: {} },
    } as any);

    vi.mocked(prisma.contact.findMany).mockRejectedValue(new Error("Database error"));

    const result = await getContactsInSegment(mockSegmentId);

    expect(result).toBeNull();
  });

  test("handles errors gracefully", async () => {
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");

    vi.mocked(getSegment).mockRejectedValue(new Error("Database error"));

    const result = await getContactsInSegment(mockSegmentId);

    expect(result).toBeNull(); // The function catches errors and returns null
  });
});

describe("generatePersonalLinks", () => {
  const mockSurveyId = "cm123456789012345678901234"; // Valid CUID2 format
  const mockSegmentId = "cm123456789012345678901235"; // Valid CUID2 format
  const mockExpirationDays = 7;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when getContactsInSegment fails", async () => {
    // Mock getSegment to fail which will cause getContactsInSegment to return null
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");

    vi.mocked(getSegment).mockRejectedValue(new Error("Segment not found"));

    const result = await generatePersonalLinks(mockSurveyId, mockSegmentId);

    expect(result).toBeNull();
  });

  test("returns empty array when no contacts in segment", async () => {
    // Mock successful segment retrieval but no contacts
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");
    const { segmentFilterToPrismaQuery } = await import(
      "@/modules/ee/contacts/segments/lib/filter/prisma-query"
    );

    vi.mocked(getSegment).mockResolvedValue({
      id: mockSegmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      environmentId: "env-123",
      description: "Test segment",
      title: "Test Segment",
      isPrivate: false,
      surveys: [],
      filters: [],
    });

    vi.mocked(segmentFilterToPrismaQuery).mockResolvedValue({
      ok: true,
      data: { whereClause: {} },
    } as any);

    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

    const result = await generatePersonalLinks(mockSurveyId, mockSegmentId);

    expect(result).toEqual([]);
  });

  test("generates personal links for contacts successfully", async () => {
    // Mock all the dependencies that getContactsInSegment needs
    const { getSegment } = await import("@/modules/ee/contacts/segments/lib/segments");
    const { segmentFilterToPrismaQuery } = await import(
      "@/modules/ee/contacts/segments/lib/filter/prisma-query"
    );
    const { getContactSurveyLink } = await import("@/modules/ee/contacts/lib/contact-survey-link");

    vi.mocked(getSegment).mockResolvedValue({
      id: mockSegmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      environmentId: "env-123",
      description: "Test segment",
      title: "Test Segment",
      isPrivate: false,
      surveys: [],
      filters: [],
    });

    vi.mocked(segmentFilterToPrismaQuery).mockResolvedValue({
      ok: true,
      data: { whereClause: {} },
    } as any);

    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      {
        id: "contact-1",
        attributes: [
          { attributeKey: { key: "email" }, value: "test@example.com" },
          { attributeKey: { key: "name" }, value: "Test User" },
        ],
      },
      {
        id: "contact-2",
        attributes: [
          { attributeKey: { key: "email" }, value: "another@example.com" },
          { attributeKey: { key: "name" }, value: "Another User" },
        ],
      },
    ] as any);

    // Mock getContactSurveyLink to return successful results
    vi.mocked(getContactSurveyLink)
      .mockReturnValueOnce({
        ok: true,
        data: "https://example.com/survey/link1",
      })
      .mockReturnValueOnce({
        ok: true,
        data: "https://example.com/survey/link2",
      });

    const result = await generatePersonalLinks(mockSurveyId, mockSegmentId, mockExpirationDays);

    expect(result).toEqual([
      {
        contactId: "contact-1",
        attributes: {
          email: "test@example.com",
          name: "Test User",
        },
        surveyUrl: "https://example.com/survey/link1",
        expirationDays: mockExpirationDays,
      },
      {
        contactId: "contact-2",
        attributes: {
          email: "another@example.com",
          name: "Another User",
        },
        surveyUrl: "https://example.com/survey/link2",
        expirationDays: mockExpirationDays,
      },
    ]);

    expect(getContactSurveyLink).toHaveBeenCalledWith("contact-1", mockSurveyId, mockExpirationDays);
    expect(getContactSurveyLink).toHaveBeenCalledWith("contact-2", mockSurveyId, mockExpirationDays);
  });
});
