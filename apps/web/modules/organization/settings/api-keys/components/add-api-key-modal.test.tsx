import { ApiKeyPermission } from "@prisma/client";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TProject } from "@formbricks/types/project";
import { AddApiKeyModal } from "./add-api-key-modal";

// Mock the translate hook
vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string) => key, // Return the key as is for testing
  }),
}));

const baseProject = {
  id: "project1",
  name: "Project 1",
  createdAt: new Date(),
  updatedAt: new Date(),
  organizationId: "org1",
  styling: {
    allowStyleOverwrite: true,
    brandColor: { light: "#000000" },
  },
  recontactDays: 0,
  inAppSurveyBranding: false,
  linkSurveyBranding: false,
  config: {
    channel: "link" as const,
    industry: "saas" as const,
  },
  placement: "bottomLeft" as const,
  clickOutsideClose: true,
  darkOverlay: false,
  languages: [],
};

const mockProjects: TProject[] = [
  {
    ...baseProject,
    environments: [
      {
        id: "env1",
        type: "production",
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: "project1",
        appSetupCompleted: true,
      },
      {
        id: "env2",
        type: "development",
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: "project1",
        appSetupCompleted: true,
      },
    ],
  },
  {
    ...baseProject,
    id: "project2",
    name: "Project 2",
    environments: [
      {
        id: "env3",
        type: "production",
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: "project2",
        appSetupCompleted: true,
      },
      {
        id: "env4",
        type: "development",
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: "project2",
        appSetupCompleted: true,
      },
    ],
  },
];

describe("AddApiKeyModal", () => {
  afterEach(() => {
    cleanup();
  });

  const mockSetOpen = vi.fn();
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    open: true,
    setOpen: mockSetOpen,
    onSubmit: mockOnSubmit,
    projects: mockProjects,
  };

  it("renders the modal with initial state", () => {
    render(<AddApiKeyModal {...defaultProps} />);

    // Check for modal title using the class and text content
    const modalTitle = screen.getByText("environments.project.api_keys.add_api_key", {
      selector: "div.text-xl",
    });
    expect(modalTitle).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. GitHub, PostHog, Slack")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });

  it("handles label input", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    const labelInput = screen.getByPlaceholderText("e.g. GitHub, PostHog, Slack") as HTMLInputElement;
    await userEvent.type(labelInput, "Test API Key");

    expect(labelInput.value).toBe("Test API Key");
  });

  it("handles permission changes", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    // Open project dropdown
    const projectDropdowns = screen.getAllByRole("button", { name: /Project 1/i });
    await userEvent.click(projectDropdowns[0]);

    // Wait for dropdown content and select Project 2
    const project2Option = await screen.findByRole("menuitem", { name: "Project 2" });
    await userEvent.click(project2Option);

    // Verify project selection
    const updatedDropdown = screen.getAllByRole("button", { name: /Project 2/i });
    expect(updatedDropdown[0]).toBeInTheDocument();
  });

  it("adds and removes permissions", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    // Add new permission
    const addButton = screen.getByRole("button", { name: /add_permission/i });
    await userEvent.click(addButton);

    // Check if new permission row is added
    const deleteButtons = screen.getAllByRole("button", { name: "" }); // Trash icons
    expect(deleteButtons).toHaveLength(2);

    // Remove permission
    await userEvent.click(deleteButtons[1]);

    // Check if permission is removed
    expect(screen.getAllByRole("button", { name: "" })).toHaveLength(1);
  });

  it("submits form with correct data", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    // Fill in label
    const labelInput = screen.getByPlaceholderText("e.g. GitHub, PostHog, Slack");
    await userEvent.type(labelInput, "Test API Key");

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: "environments.project.api_keys.add_api_key",
    });
    await userEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      label: "Test API Key",
      environmentPermissions: [
        {
          environmentId: "env1",
          permission: ApiKeyPermission.read,
        },
      ],
    });
    expect(mockSetOpen).toHaveBeenCalledWith(false);
  });

  it("disables submit button when label is empty", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    // Find submit button and check its disabled class
    const submitButton = screen.getByRole("button", {
      name: "environments.project.api_keys.add_api_key",
    });
    expect(submitButton.className).toContain("disabled:opacity-50");

    const labelInput = screen.getByPlaceholderText("e.g. GitHub, PostHog, Slack");
    await userEvent.type(labelInput, "Test");

    // After typing, button should be enabled
    expect(submitButton.className).toContain("disabled:opacity-50");
    expect(submitButton).not.toBeDisabled();
  });

  it("closes modal and resets form on cancel", async () => {
    render(<AddApiKeyModal {...defaultProps} />);

    const labelInput = screen.getByPlaceholderText("e.g. GitHub, PostHog, Slack") as HTMLInputElement;
    await userEvent.type(labelInput, "Test API Key");

    const cancelButton = screen.getByRole("button", { name: "common.cancel" });
    await userEvent.click(cancelButton);

    expect(mockSetOpen).toHaveBeenCalledWith(false);
    expect(labelInput.value).toBe("");
  });
});
