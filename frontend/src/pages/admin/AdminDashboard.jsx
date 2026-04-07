import DashboardLayout from "../../components/layout/DashboardLayout";

const AdminDashboard = () => {
  return (
    <DashboardLayout>
      <div>
        <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          <div style={cardStyle}>
            <h3>Users Management</h3>
            <p>Create and manage platform users.</p>
          </div>

          <div style={cardStyle}>
            <h3>Departments</h3>
            <p>Manage academic departments.</p>
          </div>

          <div style={cardStyle}>
            <h3>Filieres</h3>
            <p>Manage filieres and academic structure.</p>
          </div>

          <div style={cardStyle}>
            <h3>Courses</h3>
            <p>Manage courses and assignments.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const cardStyle = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export default AdminDashboard;