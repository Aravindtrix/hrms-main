import React, { PropsWithChildren } from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';

const { Header, Content } = Layout;

export default function MainLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Kannan Tools and Dies HR Management</div>
          <div>
            <Menu mode="horizontal" selectable={false} style={{ lineHeight: '64px', borderBottom: 'none' }}>
              <Menu.Item key="dashboard"><Link to="/">Dashboard</Link></Menu.Item>
              <Menu.SubMenu key="mastersMenu" title="Masters">
                <Menu.Item key="masters-departments"><Link to="/masters/departments">Departments</Link></Menu.Item>
                <Menu.Item key="masters-roles"><Link to="/masters/roles">Roles</Link></Menu.Item>
                <Menu.Item key="masters-employees"><Link to="/masters/employees">Employees</Link></Menu.Item>
              </Menu.SubMenu>
              <Menu.SubMenu key="headsMenu" title="Heads">
                <Menu.Item key="raise"><Link to="/tickets/head">Raise Ticket</Link></Menu.Item>
                <Menu.Item key="head-list"><Link to="/tickets/head/my">My Tickets</Link></Menu.Item>
                <Menu.Item key="head-shortlisted"><Link to="/candidates/head/shortlisted">Shortlisted</Link></Menu.Item>
                <Menu.Item key="head-performance"><Link to="/heads/performance">Performance Scores</Link></Menu.Item>
              </Menu.SubMenu>
              <Menu.SubMenu key="hrMenu" title="HR">
                <Menu.Item key="hr-tickets"><Link to="/tickets/hr">Tickets</Link></Menu.Item>
                <Menu.Item key="hr-candidates"><Link to="/candidates/entry">Candidate Entry</Link></Menu.Item>
                <Menu.Item key="hr-training"><Link to="/training">Training</Link></Menu.Item>
                <Menu.Item key="hr-performance"><Link to="/performance/hr">Performance</Link></Menu.Item>
                <Menu.Item key="hr-exit"><Link to="/exit">Exit</Link></Menu.Item>
              </Menu.SubMenu>
            </Menu>
          </div>
        </div>
      </Header>

      <Content style={{ margin: '24px 24px' }}>
        {children}
      </Content>
    </Layout>
  );
}
