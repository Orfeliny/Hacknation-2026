import { Link } from "react-router";
import { useReportedThreads } from "../../lib/backend/forum";
import { plural } from "../../lib/plural";
import { isFeatureRegistered } from "./registered";

export function ForumNote() {
  const { data } = useReportedThreads();
  const count = data?.length ?? 0;
  return (
    <section aria-labelledby="h-forum" className="space-y-2">
      <h2 id="h-forum" className="text-lg font-bold">
        Forum rozwoju
      </h2>
      <p>
        {data === undefined
          ? "Ładowanie…"
          : count === 0
            ? "Żaden wątek nie czeka na moderację."
            : `${count} ${plural(count, { one: "wątek czeka", few: "wątki czekają", many: "wątków czeka" })} na moderację.`}
      </p>
      {isFeatureRegistered("forum-moderation") ? (
        <Link to="/forum/moderacja">Przejdź do moderacji</Link>
      ) : null}
    </section>
  );
}
