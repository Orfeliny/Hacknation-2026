import { Link } from "react-router";
import { Card } from "../components/ui/Card";
import { PROFILE_START, useChallengeProfile } from "../lib/challengeProfile";

// The start page per profile; shown only when the module it points to is installed.
export function ProfileStart({ paths }: { paths: string[] }) {
  const profile = useChallengeProfile();
  if (profile === "all") return null;
  const start = PROFILE_START[profile];
  if (!paths.includes(start.path)) return null;
  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">{start.title}</h2>
      <p className="text-sm">{start.text}</p>
      <Link className="text-indigo-700 underline" to={start.path}>
        {start.cta}
      </Link>
    </Card>
  );
}
