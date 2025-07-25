"use client"

import ProfileMenu, { MenuOpenDirection } from "../_components/ProfileMenu"



export default function Inbox() {


    return (<div>
        <ProfileMenu
            menuOpenDirection={MenuOpenDirection.BOTTOM_RIGHT} />
    </div>)
}