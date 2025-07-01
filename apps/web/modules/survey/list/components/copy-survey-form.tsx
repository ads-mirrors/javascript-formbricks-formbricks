"use client";

import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { copySurveyToOtherEnvironmentAction } from "@/modules/survey/list/actions";
import { TUserProject } from "@/modules/survey/list/types/projects";
import { TSurvey, TSurveyCopyFormData, ZSurveyCopyFormValidation } from "@/modules/survey/list/types/surveys";
import { Button } from "@/modules/ui/components/button";
import { Checkbox } from "@/modules/ui/components/checkbox";
import { FormControl, FormField, FormItem, FormProvider } from "@/modules/ui/components/form";
import { Label } from "@/modules/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslate } from "@tolgee/react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface ICopySurveyFormProps {
  defaultProjects: TUserProject[];
  survey: TSurvey;
  onCancel: () => void;
  setOpen: (value: boolean) => void;
  onSurveysCopied?: () => void;
}

export const CopySurveyForm = ({
  defaultProjects,
  survey,
  onCancel,
  setOpen,
  onSurveysCopied,
}: ICopySurveyFormProps) => {
  const { t } = useTranslate();
  const form = useForm<TSurveyCopyFormData>({
    resolver: zodResolver(ZSurveyCopyFormValidation),
    defaultValues: {
      projects: defaultProjects.map((project) => ({
        project: project.id,
        environments: [],
      })),
    },
  });

  const formFields = useFieldArray({
    name: "projects",
    control: form.control,
  });

  const onSubmit = async (data: TSurveyCopyFormData) => {
    const filteredData = data.projects.filter((project) => project.environments.length > 0);

    try {
      const copyOperationsWithMetadata = filteredData.flatMap((projectData) => {
        const project = defaultProjects.find((p) => p.id === projectData.project);
        return projectData.environments.map((environmentId) => {
          const environment = project?.environments.find((env) => env.id === environmentId);
          return {
            operation: copySurveyToOtherEnvironmentAction({
              environmentId: survey.environmentId,
              surveyId: survey.id,
              targetEnvironmentId: environmentId,
            }),
            projectName: project?.name || "Unknown Project",
            environmentType: environment?.type || "unknown",
            environmentId,
          };
        });
      });

      const targetEnvironmentIds = copyOperationsWithMetadata.map((item) => item.environmentId);
      const shouldRefetch = targetEnvironmentIds.includes(survey.environmentId);

      const results = await Promise.allSettled(copyOperationsWithMetadata.map((item) => item.operation));

      let successCount = 0;
      let errorCount = 0;
      const errorsIndexes: number[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          errorsIndexes.push(index);
          errorCount++;
        }
      });

      if (successCount > 0) {
        if (errorCount === 0) {
          toast.success(t("environments.surveys.copy_survey_success"));
        } else {
          toast.error(
            t("environments.surveys.copy_survey_partially_success", {
              success: successCount,
              error: errorCount,
            })
          );
        }
      }

      if (errorsIndexes.length > 0) {
        errorsIndexes.forEach((index) => {
          const { projectName, environmentType } = copyOperationsWithMetadata[index];
          const result = results[index] as PromiseRejectedResult;

          const errorMessage = getFormattedErrorMessage(result.reason);
          toast.error(`[${projectName}] - [${environmentType}] - ${errorMessage}`, {
            duration: 2000 + 2000 * errorCount,
          });
        });
      }

      if (shouldRefetch && onSurveysCopied) {
        onSurveysCopied();
      }
    } catch (error) {
      toast.error(t("environments.surveys.copy_survey_error"));
    } finally {
      setOpen(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative flex h-full w-full flex-col gap-8 overflow-y-auto bg-white p-4">
        <div className="space-y-8 pb-12">
          {formFields.fields.map((field, projectIndex) => {
            const project = defaultProjects.find((project) => project.id === field.project);

            return (
              <div key={project?.id}>
                <div className="flex flex-col gap-4">
                  <div className="w-fit">
                    <p className="text-base font-semibold text-slate-900">{project?.name}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {project?.environments.map((environment) => {
                      return (
                        <FormField
                          key={environment.id}
                          control={form.control}
                          name={`projects.${projectIndex}.environments`}
                          render={({ field }) => {
                            return (
                              <FormItem>
                                <div className="flex items-center">
                                  <FormControl>
                                    <>
                                      <Checkbox
                                        {...field}
                                        type="button"
                                        onCheckedChange={() => {
                                          if (field.value.includes(environment.id)) {
                                            field.onChange(
                                              field.value.filter((id: string) => id !== environment.id)
                                            );
                                          } else {
                                            field.onChange([...field.value, environment.id]);
                                          }
                                        }}
                                        className="mr-2 h-4 w-4 appearance-none border-slate-300 checked:border-transparent checked:bg-slate-500 checked:after:bg-slate-500 checked:hover:bg-slate-500 focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50"
                                        id={environment.id}
                                      />
                                      <Label htmlFor={environment.id}>
                                        <p className="text-sm font-medium capitalize text-slate-900">
                                          {environment.type}
                                        </p>
                                      </Label>
                                    </>
                                  </FormControl>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-10 flex w-full justify-end space-x-2 bg-white">
          <div className="flex w-full justify-end pb-4 pr-4">
            <Button type="button" onClick={onCancel} variant="ghost">
              {t("common.cancel")}
            </Button>

            <Button type="submit">{t("environments.surveys.copy_survey")}</Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
