import Breadcrumb from "@/components/Common/Breadcrumb";
import { ProfileView } from "./ProfileView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon profil | INBTP",
};

export default function ProfilePage() {
  return (
    <>
      <Breadcrumb pageName="Mon profil" />
      <ProfileView />
    </>
  );
}
