import Feedbacks from "./Feedbacks";

export default function Dashboard() {
  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>反馈管理</h2>
          <p>处理每一条反馈。不再按扫码点位归类。</p>
        </div>
      </div>
      <Feedbacks />
    </div>
  );
}
