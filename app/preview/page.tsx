import { permanentRedirect } from "next/navigation";

export default function LegacyPreviewRedirect() {
  permanentRedirect("/mobile");
}
