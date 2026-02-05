import { Outlet } from 'react-router-dom';
import Header from '../../components/Header';

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard">
            <Header />
            <main className="main-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
