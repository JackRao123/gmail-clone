"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";



// direction the menu will open when you click on the profile menu button 
export enum MenuOpenDirection {
    BOTTOM_RIGHT,
    BOTTOM_LEFT,
    TOP_RIGHT,
    TOP_LEFT,
}


type ProfileMenuProps = {
    menuOpenDirection?: MenuOpenDirection;
}
// Profile picture clickable element (allows signout)
export default function ProfileMenu({ menuOpenDirection = MenuOpenDirection.BOTTOM_LEFT }: ProfileMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const router = useRouter();

    // Close the menu when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const placementClasses: Record<MenuOpenDirection, string> = {
        [MenuOpenDirection.BOTTOM_RIGHT]: "left-0  top-full   mt-2",
        [MenuOpenDirection.BOTTOM_LEFT]: "right-0 top-full   mt-2",
        [MenuOpenDirection.TOP_RIGHT]: "left-0  bottom-full mb-2",
        [MenuOpenDirection.TOP_LEFT]: "right-0 bottom-full mb-2",
    };

    return (
        <div ref={menuRef} className="relative inline-block">
            {/* Avatar / Profile Button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="  cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 focus:outline-none"
            >
                J
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className={
                        `absolute z-10 w-40 rounded-md bg-white shadow-lg ring-1 ring-black/5 ` +
                        placementClasses[menuOpenDirection]
                    }
                >

                    <button
                        onClick={async () => {
                            await signOut({ callbackUrl: "/" });
                            router.replace("/");
                        }}
                        className="cursor-pointer w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
