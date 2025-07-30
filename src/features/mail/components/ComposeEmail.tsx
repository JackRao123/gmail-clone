import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/features/shared/components/ui/button";
import { Input } from "~/features/shared/components/ui/input";
import { useTRPC } from "~/trpc/react";

interface ComposeEmailProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMinimize?: () => void;
  isMinimized?: boolean;
}

export function ComposeEmail({
  isOpen,
  onClose,
  onToggleMinimize,
  isMinimized = false,
}: ComposeEmailProps) {
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const trpc = useTRPC();

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const sendMutation = useMutation(
    trpc.mail.send.mutationOptions({
      onSuccess: (result) => {
        console.log("Email sent successfully:", result);
        toast.success("Email sent successfully!");
        // Reset form and close compose window
        setFormData({ to: "", subject: "", body: "" });
        onClose();
      },
      onError: (error) => {
        console.error("Failed to send email:", error);
        toast.error(`Failed to send email: ${error.message}`);
      },
    })
  );

  const handleSend = () => {
    // Validate form data
    if (!formData.to) {
      toast.error("Please specify a recipient");
      return;
    }

    // Send the email
    sendMutation.mutate({
      to: formData.to,
      subject: formData.subject,
      body: formData.body,
    });
  };

  const handleClose = () => {
    // Check if there's content before closing
    if (formData.to || formData.subject || formData.body) {
      if (confirm("Discard this message?")) {
        setFormData({ to: "", subject: "", body: "" });
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="w-120 rounded-t-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gray-100 px-4 py-2 dark:bg-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
            New Message
          </h3>
          <div className="flex items-center space-x-1">
            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {isMinimized ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="space-y-4 p-4">
            {/* To Field */}
            <div>
              <Input
                placeholder="To"
                value={formData.to}
                onChange={(e) => handleInputChange("to", e.target.value)}
                className="rounded-none border-0 border-b border-gray-300 px-0 py-2 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:bg-transparent"
              />
            </div>

            {/* Subject Field */}
            <div>
              <Input
                placeholder="Subject"
                value={formData.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                className="rounded-none border-0 border-b border-gray-300 px-0 py-2 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:bg-transparent"
              />
            </div>

            {/* Body Field */}
            <div className="flex-1">
              <textarea
                placeholder="Write your message here..."
                value={formData.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("body", e.target.value)
                }
                className="min-h-32 w-full resize-none border-0 px-0 py-2 focus:ring-0 dark:bg-transparent"
                rows={8}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleSend}
                  size="sm"
                  disabled={sendMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
