import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SocialMediaTab } from "./SocialMediaTab";

// Mock useTranslate
const mockTranslate = vi.fn((key) => key);
vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: mockTranslate,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock window.open
Object.defineProperty(window, "open", {
  writable: true,
  value: vi.fn(),
});

const mockSurveyUrl = "https://app.formbricks.com/s/survey1";
const mockSurveyTitle = "Test Survey";

const expectedPlatforms = [
  { name: "LinkedIn", icon: "🔗", description: "Share on LinkedIn" },
  { name: "Threads", icon: "📝", description: "Share on Threads" },
  { name: "Facebook", icon: "👍", description: "Share on Facebook" },
  { name: "Reddit", icon: "🤖", description: "Share on Reddit" },
  { name: "X", icon: "❌", description: "Share on X (formerly Twitter)" },
];

describe("SocialMediaTab", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("renders the main heading and description", () => {
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    expect(
      screen.getByText("environments.surveys.summary.share_your_survey_on_social_media")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "environments.surveys.summary.get_responses_from_your_contacts_on_various_social_media_networks"
      )
    ).toBeInTheDocument();
  });

  test("renders all social media platforms with correct icons and descriptions", () => {
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    expectedPlatforms.forEach((platform) => {
      expect(screen.getByText(platform.name)).toBeInTheDocument();
      expect(screen.getByText(platform.icon)).toBeInTheDocument();
      expect(screen.getByText(platform.description)).toBeInTheDocument();
    });
  });

  test("renders source tracking alert with correct content", () => {
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    expect(screen.getByText("environments.surveys.summary.source_tracking_enabled")).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return (
          element?.textContent ===
          "environments.surveys.summary.when_sharing_from_this_dialog_the_social_media_network_will_be_appended_to_the_survey_link_so_you_know_which_responses_came_via_each_network"
        );
      })
    ).toBeInTheDocument();
    expect(screen.getByText("common.learn_more")).toBeInTheDocument();

    const learnMoreLink = screen.getByRole("link", { name: /learn more/i });
    expect(learnMoreLink).toHaveAttribute(
      "href",
      "https://formbricks.com/docs/xm-and-surveys/surveys/link-surveys/source-tracking"
    );
    expect(learnMoreLink).toHaveAttribute("target", "_blank");
  });

  test("renders share buttons for all platforms", () => {
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    const shareButtons = screen.getAllByText("Share");
    expect(shareButtons).toHaveLength(expectedPlatforms.length);
  });

  test("opens sharing window when LinkedIn share button is clicked", () => {
    const mockWindowOpen = vi.spyOn(window, "open");
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    const linkedInShareButton = screen.getAllByText("Share")[0]; // LinkedIn is first
    fireEvent.click(linkedInShareButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("linkedin.com/shareArticle"),
      "share-dialog",
      "width=600,height=400,location=no,toolbar=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    );
  });

  test("includes source tracking in shared URLs", () => {
    const mockWindowOpen = vi.spyOn(window, "open");
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    const linkedInShareButton = screen.getAllByText("Share")[0]; // LinkedIn is first
    fireEvent.click(linkedInShareButton);

    const calledUrl = mockWindowOpen.mock.calls[0][0] as string;
    const decodedUrl = decodeURIComponent(calledUrl);
    expect(decodedUrl).toContain("source=linkedin");
  });

  test("opens sharing window when Facebook share button is clicked", () => {
    const mockWindowOpen = vi.spyOn(window, "open");
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    const facebookShareButton = screen.getAllByText("Share")[2]; // Facebook is third
    fireEvent.click(facebookShareButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("facebook.com/sharer"),
      "share-dialog",
      "width=600,height=400,location=no,toolbar=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    );
  });

  test("opens sharing window when X share button is clicked", () => {
    const mockWindowOpen = vi.spyOn(window, "open");
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} surveyTitle={mockSurveyTitle} />);

    const xShareButton = screen.getAllByText("Share")[4]; // X is fifth (last)
    fireEvent.click(xShareButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "share-dialog",
      "width=600,height=400,location=no,toolbar=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    );
  });

  test("handles default survey title when none provided", () => {
    render(<SocialMediaTab surveyUrl={mockSurveyUrl} />);

    // Should still render all platforms
    expectedPlatforms.forEach((platform) => {
      expect(screen.getByText(platform.name)).toBeInTheDocument();
    });
  });

  test("encodes URLs and titles correctly for sharing", () => {
    const specialCharUrl = "https://app.formbricks.com/s/survey1?param=test&other=value";
    const specialCharTitle = "Test Survey & More";
    const mockWindowOpen = vi.spyOn(window, "open");

    render(<SocialMediaTab surveyUrl={specialCharUrl} surveyTitle={specialCharTitle} />);

    const linkedInShareButton = screen.getAllByText("Share")[0];
    fireEvent.click(linkedInShareButton);

    const calledUrl = mockWindowOpen.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent(specialCharTitle));
  });
});
