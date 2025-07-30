import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/features/shared/components/ui/button";
import { Input } from "~/features/shared/components/ui/input";
import { useTRPC } from "~/trpc/react";

interface ForwardFormProps {
  isOpen: boolean;
  onClose: () => void;
  originalEmail: {
    from: string | null;
    to: string | null;
    subject: string | null;
    html: string;
    messageId: string;
  };
}

export function ForwardForm({
  isOpen,
  onClose,
  originalEmail,
}: ForwardFormProps) {
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const trpc = useTRPC();
  const editorRef = useRef<HTMLDivElement>(null); // so that cursor doesn't jump around when the user edits HTML

  // Initialize form data when component opens
  useEffect(() => {
    if (isOpen) {
      // Set the subject with "Fwd:" prefix
      const subject = originalEmail.subject?.startsWith("Fwd:")
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject ?? ""}`;

      // Create forwarded message content
      const forwardedContent = ` 
        <p><strong>---------- Forwarded message ---------</strong></p>
        <p><strong>From:</strong> ${originalEmail.from ?? "Unknown"}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Subject:</strong> ${originalEmail.subject ?? "No subject"}</p>
        <p><strong>To:</strong> ${originalEmail.to ?? "Unknown"}</p>
        <br>
        ${originalEmail.html}
      `;

      setFormData({
        to: "",
        subject: subject,
        body: forwardedContent,
      });

      // Set the content in the editor after a short delay to ensure the ref is available
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = forwardedContent;
          // Set cursor to the beginning
          const range = document.createRange();
          const selection = window.getSelection();
          range.setStart(editorRef.current, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 0);
    }
  }, [isOpen, originalEmail]);

  const sendMutation = useMutation(
    trpc.mail.send.mutationOptions({
      onSuccess: (result) => {
        console.log("Forward sent successfully:", result);
        toast.success("Forward sent successfully!");
        // Reset form and close forward form
        setFormData({ to: "", subject: "", body: "" });
        onClose();
      },
      onError: (error) => {
        console.error("Failed to send forward:", error);
        toast.error(`Failed to send forward: ${error.message}`);
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

    // Send the forward
    sendMutation.mutate({
      to: formData.to,
      subject: formData.subject,
      body: formData.body,
    });
  };

  const handleClose = () => {
    // Check if there's content before closing
    if (formData.body.trim()) {
      if (confirm("Discard this forward?")) {
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
          Forward
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
        {/* To Field */}
        <div>
          <Input
            placeholder="To"
            value={formData.to}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, to: e.target.value }))
            }
            className="rounded-none border-0 border-b border-gray-300 px-0 py-2 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:bg-transparent"
          />
        </div>

        {/* Subject Field */}
        <div>
          <Input
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="rounded-none border-0 border-b border-gray-300 px-0 py-2 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:bg-transparent"
          />
        </div>

        {/* HTML Body Field */}
        <div className="flex-1">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Message (HTML):
          </div>
          <div className="rounded-md border border-gray-300 dark:border-gray-600">
            <div
              ref={editorRef}
              contentEditable
              className="min-h-48 w-full resize-none px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-transparent"
              onInput={(e) => {
                const content = e.currentTarget.innerHTML;
                setFormData((prev) => ({ ...prev, body: content }));
              }}
              style={{
                minHeight: "12rem",
                outline: "none",
              }}
            />
          </div>
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
    </div>
  );
}
