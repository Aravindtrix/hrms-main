import React from 'react';
import { Row, Col, Card, Table, Button, Select } from 'antd';

const { Option } = Select;

type SafetyRow = {
  key: number;
  sku: string;
  name: string;
  onHand: number;
  safety: number;
  reorder: number;
};

const safetyData: SafetyRow[] = [
  { key: 1, sku: 'ABC-003', name: 'Widget C', onHand: 0, safety: 10, reorder: 10 },
  { key: 2, sku: 'DR001', name: 'Drill bit', onHand: 0, safety: 10, reorder: 10 },
  { key: 3, sku: 'ER001', name: 'Blade', onHand: 0, safety: 10, reorder: 10 },
  { key: 4, sku: 'IT002', name: 'Inser02', onHand: 3, safety: 10, reorder: 10 },
  { key: 5, sku: 'ABC-001', name: 'Widget A', onHand: 17, safety: 20, reorder: 20 },
];

const safetyColumns = [
  { title: 'SKU', dataIndex: 'sku', key: 'sku' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'On Hand', dataIndex: 'onHand', key: 'onHand' },
  { title: 'Safety', dataIndex: 'safety', key: 'safety' },
  { title: 'Reorder Level', dataIndex: 'reorder', key: 'reorder' },
];

type InspectionRow = {
  key: number;
  grn: string;
  item: string;
  qty: number;
  warehouse: number;
};

const inspectionsData: InspectionRow[] = [
  { key: 1, grn: 'GRN/25/000017', item: 'ABC-001 - Widget A', qty: 4.0, warehouse: 1 },
];

const inspectionsColumns = [
  { title: 'GRN', dataIndex: 'grn', key: 'grn' },
  { title: 'Item', dataIndex: 'item', key: 'item' },
  { title: 'Qty Submitted', dataIndex: 'qty', key: 'qty' },
  { title: 'Warehouse', dataIndex: 'warehouse', key: 'warehouse' },
  { title: 'Accept', key: 'accept', render: () => <input type="number" defaultValue={0} style={{ width: 60 }} /> },
  { title: 'Reject', key: 'reject', render: () => <input type="number" defaultValue={0} style={{ width: 60 }} /> },
  { title: 'Rejection Reason', key: 'reason', render: () => <input placeholder="Required if rejecting" style={{ width: 200 }} /> },
  { title: 'Action', key: 'action', render: () => <Button type="primary">Submit</Button> },
];

export default function Dashboard() {
  return (
    <div>
      <Row gutter={[24, 24]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <div style={{ color: '#888' }}>Total Items</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>12</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ color: '#888' }}>Safety Alerts</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>5</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ color: '#888' }}>Last Refresh</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>1:01:25 PM</div>
          </Card>
        </Col>
      </Row>

      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <h3>Safety stock alerts</h3>
        </Col>
        <Col>
          <span style={{ marginRight: 8 }}>View:</span>
          <Select defaultValue="all" style={{ width: 120, marginRight: 12 }}>
            <Option value="all">All</Option>
            <Option value="low">Low</Option>
          </Select>
          <Button type="primary" style={{ marginRight: 8 }}>Refresh</Button>
          <Button>Refresh POs</Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Table dataSource={safetyData} columns={safetyColumns} pagination={false} />
      </Card>

      <h3>Inspections</h3>
      <Card>
        <Table dataSource={inspectionsData} columns={inspectionsColumns} pagination={false} />
      </Card>
    </div>
  );
}
