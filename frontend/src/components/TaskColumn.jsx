export default function TaskColumn({ title, count, variant }) {
  return (
    <div className="col-md-4">
      <div className="card shadow-sm border-0 p-3">
        <h5 className={`card-title text-${variant} fw-bold`}>{title}</h5>
        <p className="text-secondary small">{count} tasks</p>
        <button className={`btn btn-outline-${variant} btn-sm w-100`}>
          + Add Task
        </button>
      </div>
    </div>
  );
}