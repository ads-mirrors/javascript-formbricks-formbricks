"use client";

import { Alert, AlertButton, AlertDescription, AlertTitle } from "@/modules/ui/components/alert";
import { Button } from "@/modules/ui/components/button";
import { DatePicker } from "@/modules/ui/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";
import { useTranslate } from "@tolgee/react";
import { AlertCircleIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { TSegment } from "@formbricks/types/segment";
import { generatePersonalLinksAction } from "../../actions";

interface PersonalLinksTabProps {
  environmentId: string;
  surveyId: string;
  segments: TSegment[];
}

// Custom DatePicker component with date restrictions
const RestrictedDatePicker = ({
  date,
  updateSurveyDate,
}: {
  date: Date | null;
  updateSurveyDate: (date: Date) => void;
}) => {
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return <DatePicker date={date} updateSurveyDate={updateSurveyDate} minDate={tomorrow} />;
};

export const PersonalLinksTab = ({ environmentId, segments, surveyId }: PersonalLinksTabProps) => {
  const { t } = useTranslate();
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const publicSegments = segments.filter((segment) => !segment.isPrivate);

  const handleGenerateLinks = async () => {
    if (!selectedSegment || isGenerating) return;

    setIsGenerating(true);

    // Show initial toast
    toast.success(t("environments.surveys.summary.generating_links_toast"), {
      duration: 5000,
      id: "generating-links",
    });

    try {
      const result = await generatePersonalLinksAction({
        surveyId: surveyId,
        segmentId: selectedSegment,
        environmentId: environmentId,
        expirationDays: expiryDate
          ? Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
      });
      console.log(result);

      if (result?.data) {
        // Success toast
        toast.success(
          t("environments.surveys.summary.links_generated_success_toast") ||
            "Links generated successfully. Please check your Downloads directory.",
          {
            duration: 5000,
            id: "links-generated",
          }
        );

        // Trigger CSV download
        const link = document.createElement("a");
        link.href = result.data.downloadUrl;
        link.download = result.data.fileName || "personal-links.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Error toast
        toast.error(t("common.something_went_wrong_please_try_again"), {
          duration: 5000,
          id: "links-error",
        });
      }
    } catch (error) {
      console.error("Error generating links:", error);

      // Error toast
      toast.error(t("common.something_went_wrong_please_try_again"), {
        duration: 5000,
        id: "links-error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Button state logic
  const isButtonDisabled = !selectedSegment || isGenerating || publicSegments.length === 0;
  const buttonText = isGenerating
    ? t("environments.surveys.summary.generating_links")
    : t("environments.surveys.summary.generate_and_download_links");

  return (
    <div className="flex h-full grow flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-800">
          {t("environments.surveys.summary.generate_personal_links_title")}
        </h2>
        <p className="text-sm text-slate-600">
          {t("environments.surveys.summary.generate_personal_links_description")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Recipients Section */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("common.recipients")}</label>
          <Select
            value={selectedSegment}
            onValueChange={setSelectedSegment}
            disabled={publicSegments.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  publicSegments.length === 0
                    ? t("environments.surveys.summary.no_segments_available")
                    : t("environments.surveys.summary.select_segment")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {publicSegments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            {t("environments.surveys.summary.create_and_manage_segments")}
          </p>
        </div>

        {/* Expiry Date Section */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {t("environments.surveys.summary.expiry_date_optional")}
          </label>
          <RestrictedDatePicker date={expiryDate} updateSurveyDate={setExpiryDate} />
          <p className="mt-1 text-xs text-slate-500">
            {t("environments.surveys.summary.expiry_date_description")}
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateLinks}
          disabled={isButtonDisabled}
          loading={isGenerating}
          className="w-fit">
          <DownloadIcon className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </div>
      <hr />

      {/* Info Box */}
      <Alert variant="default">
        <AlertCircleIcon />
        <AlertTitle>{t("environments.surveys.summary.personal_links_work_with_segments")}</AlertTitle>
        <AlertDescription>
          {t("environments.surveys.summary.to_create_personal_links_segment_required")}
        </AlertDescription>
        <AlertButton>
          <Link
            href="https://formbricks.com/docs/xm-and-surveys/surveys/website-app-surveys/advanced-targeting#segment-configuration"
            target="_blank"
            rel="noopener noreferrer">
            {t("common.learn_more")}
          </Link>
        </AlertButton>
      </Alert>
    </div>
  );
};
