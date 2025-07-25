"use client";

import { signIn } from "next-auth/react";
import GoogleLogo from "../../assets/icons/google_logo.svg";
import Image, { type StaticImageData } from "next/image";

import XmailLogo from "../../assets/icons/xmail_logo.png"

function SignInButton() {
  return (
    <div className="w-full max-w-sm space-y-3">
      <button
        onClick={() => signIn("google", { callbackUrl: "/home" })}
        className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white py-2 font-medium transition hover:bg-gray-50"
      >
        <Image
          src={GoogleLogo as unknown as StaticImageData}
          alt="Google logo"
          className="object-contain"
        />

        <span>
          Continue with <span className="font-semibold">Google</span>
        </span>
      </button>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <Image
        src={XmailLogo}
        alt="Airtable logo"
        className="h-12 w-auto object-contain"
      />
      <h1 className="mb-6 text-3xl font-semibold">Sign in to Xmail</h1>
      <SignInButton />
    </main>
  );
}
