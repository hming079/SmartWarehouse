import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";
import { summary } from "../../constants/mockData";

const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#f5f6fa]">
      <Sidebar />
      <main className="flex-1 p-5 lg:p-6">
        <Header location={summary.location} user={summary.user} />
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
};

export default MainLayout;

