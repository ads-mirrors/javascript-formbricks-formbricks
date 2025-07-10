import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ShareView } from "./share-view";

// Mock child components
vi.mock("./AppTab", () => ({
  AppTab: () => <div data-testid="app-tab">AppTab Content</div>,
}));
vi.mock("./EmailTab", () => ({
  EmailTab: (props: { surveyId: string; email: string }) => (
    <div data-testid="email-tab">
      EmailTab Content for {props.surveyId} with {props.email}
    </div>
  ),
}));
vi.mock("./LinkTab", () => ({
  LinkTab: (props: { survey: any; surveyUrl: string }) => (
    <div data-testid="link-tab">
      LinkTab Content for {props.survey.id} at {props.surveyUrl}
    </div>
  ),
}));
vi.mock("./QRCodeTab", () => ({
  QRCodeTab: (props: { surveyUrl: string }) => (
    <div data-testid="qr-code-tab">QRCodeTab Content for {props.surveyUrl}</div>
  ),
}));
vi.mock("./WebsiteTab", () => ({
  WebsiteTab: (props: { surveyUrl: string; environmentId: string }) => (
    <div data-testid="website-tab">
      WebsiteTab Content for {props.surveyUrl} in {props.environmentId}
    </div>
  ),
}));

vi.mock("./personal-links-tab", () => ({
  PersonalLinksTab: (props: { segments: any[]; surveyId: string; environmentId: string }) => (
    <div data-testid="personal-links-tab">
      PersonalLinksTab Content for {props.surveyId} in {props.environmentId}
    </div>
  ),
}));

vi.mock("@/modules/ui/components/upgrade-prompt", () => ({
  UpgradePrompt: (props: { title: string; description: string; buttons: any[] }) => (
    <div data-testid="upgrade-prompt">
      {props.title} - {props.description}
    </div>
  ),
}));

// Mock @tolgee/react
vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string) => key,
  }),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ArrowLeftIcon: () => <div data-testid="arrow-left-icon">ArrowLeftIcon</div>,
  MailIcon: () => <div data-testid="mail-icon">MailIcon</div>,
  LinkIcon: () => <div data-testid="link-icon">LinkIcon</div>,
  GlobeIcon: () => <div data-testid="globe-icon">GlobeIcon</div>,
  SmartphoneIcon: () => <div data-testid="smartphone-icon">SmartphoneIcon</div>,
  AlertCircle: ({ className }: { className?: string }) => (
    <div className={className} data-testid="alert-circle">
      AlertCircle
    </div>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <div className={className} data-testid="alert-triangle">
      AlertTriangle
    </div>
  ),
  Info: ({ className }: { className?: string }) => (
    <div className={className} data-testid="info">
      Info
    </div>
  ),
}));

const mockTabs = [
  { id: "email", label: "Email", icon: () => <div data-testid="email-tab-icon" /> },
  { id: "webpage", label: "Web Page", icon: () => <div data-testid="webpage-tab-icon" /> },
  { id: "link", label: "Link", icon: () => <div data-testid="link-tab-icon" /> },
  { id: "qr-code", label: "QR Code", icon: () => <div data-testid="qr-code-tab-icon" /> },
  { id: "app", label: "App", icon: () => <div data-testid="app-tab-icon" /> },
];

const mockSurveyLink = {
  id: "survey1",
  type: "link",
  name: "Test Link Survey",
  status: "inProgress",
  environmentId: "env1",
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [],
  displayOption: "displayOnce",
  recontactDays: 0,
  triggers: [],
  languages: [],
  autoClose: null,
  delay: 0,
  autoComplete: null,
  runOnDate: null,
  closeOnDate: null,
  singleUse: { enabled: false, isEncrypted: false },
  styling: null,
} as any;
const mockSurveyWeb = {
  id: "survey2",
  type: "app",
  name: "Test Web Survey",
  status: "inProgress",
  environmentId: "env1",
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [],
  displayOption: "displayOnce",
  recontactDays: 0,
  triggers: [],
  languages: [],
  autoClose: null,
  delay: 0,
  autoComplete: null,
  runOnDate: null,
  closeOnDate: null,
  singleUse: { enabled: false, isEncrypted: false },
  styling: null,
} as any;

const defaultProps = {
  tabs: mockTabs,
  activeId: "email",
  setActiveId: vi.fn(),
  environmentId: "env1",
  survey: mockSurveyLink,
  email: "test@example.com",
  surveyUrl: "http://example.com/survey1",
  publicDomain: "http://example.com",
  setSurveyUrl: vi.fn(),
  locale: "en" as any,
  segments: [],
  isContactsEnabled: true,
  isFormbricksCloud: false,
};

describe("EmbedView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("does not render desktop tabs for non-link survey type", () => {
    render(<ShareView {...defaultProps} survey={mockSurveyWeb} />);
    // Desktop tabs container should not be present or not have lg:flex if it's a common parent
    const desktopTabsButtons = screen.queryAllByRole("button", { name: /Email|Web Page|Link|App/i });
    // Check if any of these buttons are part of a container that is only visible on large screens
    const desktopTabContainer = desktopTabsButtons[0]?.closest("div.lg\\:flex");
    expect(desktopTabContainer).toBeNull();
  });

  test("calls setActiveId when a tab is clicked (desktop)", async () => {
    render(<ShareView {...defaultProps} survey={mockSurveyLink} activeId="email" />);
    const webpageTabButton = screen.getAllByRole("button", { name: "Web Page" })[0]; // First one is desktop
    await userEvent.click(webpageTabButton);
    expect(defaultProps.setActiveId).toHaveBeenCalledWith("webpage");
  });

  test("renders EmailTab when activeId is 'email'", () => {
    render(<ShareView {...defaultProps} activeId="email" />);
    expect(screen.getByTestId("email-tab")).toBeInTheDocument();
    expect(
      screen.getByText(`EmailTab Content for ${defaultProps.survey.id} with ${defaultProps.email}`)
    ).toBeInTheDocument();
  });

  test("renders WebsiteTab when activeId is 'webpage'", () => {
    render(<ShareView {...defaultProps} activeId="webpage" />);
    expect(screen.getByTestId("website-tab")).toBeInTheDocument();
    expect(
      screen.getByText(`WebsiteTab Content for ${defaultProps.surveyUrl} in ${defaultProps.environmentId}`)
    ).toBeInTheDocument();
  });

  test("renders LinkTab when activeId is 'link'", () => {
    render(<ShareView {...defaultProps} activeId="link" />);
    expect(screen.getByTestId("link-tab")).toBeInTheDocument();
    expect(
      screen.getByText(`LinkTab Content for ${defaultProps.survey.id} at ${defaultProps.surveyUrl}`)
    ).toBeInTheDocument();
  });

  test("renders AppTab when activeId is 'app'", () => {
    render(<ShareView {...defaultProps} activeId="app" />);
    expect(screen.getByTestId("app-tab")).toBeInTheDocument();
  });

  test("calls setActiveId when a responsive tab is clicked", async () => {
    render(<ShareView {...defaultProps} survey={mockSurveyLink} activeId="email" />);
    // Get the responsive tab button (second instance of the button with this name)
    const responsiveWebpageTabButton = screen.getAllByRole("button", { name: "Web Page" })[1];
    await userEvent.click(responsiveWebpageTabButton);
    expect(defaultProps.setActiveId).toHaveBeenCalledWith("webpage");
  });

  test("applies active styles to the active tab (desktop)", () => {
    render(<ShareView {...defaultProps} survey={mockSurveyLink} activeId="email" />);
    const emailTabButton = screen.getAllByRole("button", { name: "Email" })[0];
    expect(emailTabButton).toHaveClass("bg-slate-100");
    expect(emailTabButton).toHaveClass("font-medium");
    expect(emailTabButton).toHaveClass("text-slate-900");

    const webpageTabButton = screen.getAllByRole("button", { name: "Web Page" })[0];
    expect(webpageTabButton).not.toHaveClass("bg-slate-100");
    expect(webpageTabButton).not.toHaveClass("font-medium");
  });

  test("applies active styles to the active tab (responsive)", () => {
    render(<ShareView {...defaultProps} survey={mockSurveyLink} activeId="email" />);
    const responsiveEmailTabButton = screen.getAllByRole("button", { name: "Email" })[1];
    expect(responsiveEmailTabButton).toHaveClass("bg-white text-slate-900 shadow-sm");

    const responsiveWebpageTabButton = screen.getAllByRole("button", { name: "Web Page" })[1];
    expect(responsiveWebpageTabButton).toHaveClass("border-transparent text-slate-700 hover:text-slate-900");
  });

  test("renders QRCodeTab when activeId is 'qr-code'", () => {
    render(<ShareView {...defaultProps} activeId="qr-code" />);
    expect(screen.getByTestId("qr-code-tab")).toBeInTheDocument();
    expect(screen.getByText(`QRCodeTab Content for ${defaultProps.surveyUrl}`)).toBeInTheDocument();
  });

  test("calls setActiveId when QR code tab is clicked (desktop)", async () => {
    render(<ShareView {...defaultProps} survey={mockSurveyLink} activeId="email" />);
    const qrCodeTabButton = screen.getAllByRole("button", { name: "QR Code" })[0]; // First one is desktop
    await userEvent.click(qrCodeTabButton);
    expect(defaultProps.setActiveId).toHaveBeenCalledWith("qr-code");
  });

  test("returns null for unknown activeId", () => {
    render(<ShareView {...defaultProps} activeId="unknown" />);
    // Should not render any specific tab component
    expect(screen.queryByTestId("email-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("website-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("qr-code-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("personal-links-tab")).not.toBeInTheDocument();
  });
});
