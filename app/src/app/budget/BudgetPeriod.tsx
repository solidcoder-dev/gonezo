import { useParams } from 'react-router-dom';

export function BudgetPeriod() {
  const { periodId } = useParams();

  return (
    <section className="card">
      <h1>Budget Period</h1>
      <p>Period: {periodId}</p>
      <p>Step 3 will render balances and reservations.</p>
    </section>
  );
}
