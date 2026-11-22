import { Link } from "react-router";
import { isFeatureRegistered } from "./registered";

export function EmployeeLink({
  employeeId,
  name,
}: {
  employeeId: string;
  name: string;
}) {
  if (!isFeatureRegistered("employee-card")) return <>{name}</>;
  return (
    <Link to={`/kadry/pracownik?pracownik=${encodeURIComponent(employeeId)}`}>
      {name}
    </Link>
  );
}
