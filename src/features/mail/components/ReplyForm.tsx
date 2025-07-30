import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";

interface ReplyFormProps {
  isOpen: boolean;
  onClose: () => void;
  originalEmail: {
    from: string | null;
    to: string | null;
    subject: string | null;
    html: string;
    messageId: string;
  };
  threadId: string;
}

export function ReplyForm({
  isOpen,
  onClose,
  originalEmail,
  threadId,
}: ReplyFormProps) {
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const trpc = useTRPC();

  // Extract email address from a string that might contain display name like "\"Leonard Excalibur\" <leoexc371@gmail.com>"
  const extractEmailAddress = (emailString: string | null): string => {
    if (!emailString) return "";

    // Try to extract email from format like "John Doe <john@example.com>"
    const emailMatch = emailString.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1];
    }

    // If no angle brackets, check if it's a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailString)) {
      return emailString;
    }

    return "";
  };

  // Initialize form data when component opens
  React.useEffect(() => {
    if (isOpen) {
      // Set the recipient to the original sender (extract email only)
      const recipient = extractEmailAddress(originalEmail.from);
      // Add "Re: " prefix to subject if it doesn't already have it
      const subject = originalEmail.subject?.startsWith("Re:")
        ? originalEmail.subject
        : `Re: ${originalEmail.subject || ""}`;

      setFormData({
        to: recipient,
        subject: subject,
        body: "",
      });
    }
  }, [isOpen, originalEmail]);

  const replyMutation = useMutation(
    trpc.mail.reply.mutationOptions({
      onSuccess: (result) => {
        console.log("Reply sent successfully:", result);
        toast.success("Reply sent successfully!");
        // Reset form and close reply form
        setFormData({ to: "", subject: "", body: "" });
        onClose();
      },
      onError: (error) => {
        console.error("Failed to send reply:", error);
        toast.error(`Failed to send reply: ${error.message}`);
      },
    })
  );

  const handleSend = () => {
    // Validate form data
    if (!formData.to) {
      toast.error("Please specify a recipient");
      return;
    }
    if (!formData.body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Send the reply
    replyMutation.mutate({
      to: formData.to,
      subject: formData.subject,
      body: formData.body,
      threadId: threadId,
      originalMessageId: originalEmail.messageId,
    });
  };

  const handleClose = () => {
    // Check if there's content before closing
    if (formData.body.trim()) {
      if (confirm("Discard this reply?")) {
        setFormData({ to: "", subject: "", body: "" });
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Reply
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <hr></hr>

        {/* Body Field */}
        <div className="flex-1">
          <textarea
            placeholder="Write your reply..."
            value={formData.body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev) => ({ ...prev, body: e.target.value }))
            }
            className="min-h-24 w-full resize-none border-0 px-0 py-2 focus:ring-0 dark:bg-transparent"
            rows={6}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSend}
              size="sm"
              disabled={replyMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="mr-2 h-4 w-4" />
              {replyMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
