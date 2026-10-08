import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { App, Avatar, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, Upload } from "antd";
import { QRCodeSVG } from "qrcode.react";
import dayjs, { type Dayjs } from "dayjs";
import { api, downloadFile, getUser, uploadFile } from "../api";
import { downloadPersonnelQrZip } from "../personnelQr";
import { avatarSrc, personLink, personTagOptions, type PersonnelItem } from "../types";

type PersonnelForm = {
  name: string;
  gender?: string;
  idCard?: string;
  birthDate?: Dayjs;
  ethnicity?: string;
  householdAddress?: string;
  residenceAddress?: string;
  phone?: string;
  householdNo?: string;
  education?: string;
  maritalStatus?: string;
  healthStatus?: string;
  employmentStatus?: string;
  workLocation?: string;
  insuranceStatus?: string;
  tags?: string[];
  remark?: string;
  infoDate?: Dayjs;
  collector?: string;
  avatar?: string;
};

function AvatarField({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  return (
    <div className="avatar-field">
      <Upload
        accept="image/jpeg,image/png,image/webp,image/gif"
        showUploadList={false}
        beforeUpload={(file) => {
          if (file.size > 2 * 1024 * 1024) {
            message.error("头像不能超过 2MB");
            return Upload.LIST_IGNORE;
          }
          return true;
        }}
        customRequest={async ({ file, onSuccess, onError }) => {
          const body = new FormData();
          body.append("file", file as File);
          setUploading(true);
          try {
            const data = await uploadFile<{ avatar: string }>("/api/personnel/avatar", body);
            onChange?.(data.avatar);
            onSuccess?.(data);
          } catch (error) {
            const reason = error instanceof Error ? error : new Error("上传失败");
            message.error(reason.message);
            onError?.(reason);
          } finally {
            setUploading(false);
          }
        }}
      >
        <button type="button" className="avatar-picker">
          {value ? <img src={avatarSrc(value)} alt="" /> : <span>{uploading ? "上传中" : "上传头像"}</span>}
        </button>
      </Upload>
      {value ? (
        <Button type="link" onClick={() => onChange?.("")}>
          移除
        </Button>
      ) : null}
    </div>
  );
}

const choices = {
  gender: ["男", "女"],
  education: ["文盲", "小学", "初中", "高中", "中专", "大专", "本科", "研究生及以上"],
  marital: ["未婚", "已婚", "离异", "丧偶"],
  health: ["健康", "患有慢性病", "重大疾病", "残疾", "其他"],
  employment: ["就业", "务农", "外出务工", "灵活就业", "未就业", "退休", "在校"],
  insurance: ["职工医保", "居民医保", "养老保险", "医保和养老", "未参保", "其他"],
};

function toOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

type PersonFilters = {
  name: string;
  gender: string;
  idCard: string;
  phone: string;
  tag: string;
  infoDate: string;
  status: string;
  collector: string;
};

const emptyFilters: PersonFilters = {
  name: "",
  gender: "",
  idCard: "",
  phone: "",
  tag: "",
  infoDate: "",
  status: "",
  collector: "",
};

function filterQuery(filters: PersonFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const text = value.trim();
    if (text) params.set(key, text);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function Personnel() {
  const current = getUser();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<PersonnelItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelItem | null>(null);
  const [qrPerson, setQrPerson] = useState<PersonnelItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [packing, setPacking] = useState(false);
  const [draft, setDraft] = useState<PersonFilters>(emptyFilters);
  const [applied, setApplied] = useState<PersonFilters>(emptyFilters);
  const [form] = Form.useForm<PersonnelForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPeople(await api<PersonnelItem[]>(`/api/personnel${filterQuery(applied)}`));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    if (current?.role === "admin") void load();
  }, [load]);

  if (current?.role !== "admin") return <Navigate to="/" replace />;

  function openEditor(person: PersonnelItem | null) {
    setEditing(person);
    form.resetFields();
    if (person) {
      form.setFieldsValue({
        name: person.name,
        gender: person.gender || undefined,
        idCard: person.id_card,
        birthDate: person.birth_date ? dayjs(person.birth_date) : undefined,
        ethnicity: person.ethnicity,
        householdAddress: person.household_address,
        residenceAddress: person.residence_address,
        phone: person.phone,
        householdNo: person.household_no,
        education: person.education || undefined,
        maritalStatus: person.marital_status || undefined,
        healthStatus: person.health_status || undefined,
        employmentStatus: person.employment_status || undefined,
        workLocation: person.work_location,
        insuranceStatus: person.insurance_status || undefined,
        tags: person.tags,
        remark: person.remark,
        infoDate: person.info_date ? dayjs(person.info_date) : undefined,
        collector: person.collector,
        avatar: person.avatar,
      });
    } else {
      form.setFieldsValue({
        infoDate: dayjs(),
        collector: getUser()?.displayName || "",
        ethnicity: "汉族",
      });
    }
    setOpen(true);
  }

  async function toggleStatus(person: PersonnelItem) {
    try {
      await api(`/api/personnel/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: person.status === 1 ? 0 : 1 }),
      });
      message.success(person.status === 1 ? "已停用" : "已启用");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function remove(person: PersonnelItem) {
    try {
      await api(`/api/personnel/${person.id}`, { method: "DELETE" });
      message.success("已删除");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>人员信息</h2>
          <p>可按姓名、身份证号、电话、人员类别等模糊筛选。导入和导出只支持 Excel（.xlsx）。可一键下载全部人员的姓名和二维码。</p>
        </div>
        <div className="heading-actions">
          <Upload
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            showUploadList={false}
            beforeUpload={(file) => {
              if (!file.name.toLowerCase().endsWith(".xlsx")) {
                message.error("只能导入 Excel 文件（.xlsx）");
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            customRequest={async ({ file, onSuccess, onError }) => {
              const body = new FormData();
              body.append("file", file as File);
              setImporting(true);
              try {
                const result = await uploadFile<{ created: number; updated: number; failed: Array<{ row: number; message: string }> }>(
                  "/api/personnel/import",
                  body,
                );
                const summary = `新增 ${result.created} 条，更新 ${result.updated} 条`;
                if (result.failed.length) {
                  const detail = result.failed
                    .slice(0, 3)
                    .map((item) => `第 ${item.row} 行${item.message}`)
                    .join("；");
                  message.warning(`${summary}，${result.failed.length} 行未导入：${detail}`);
                } else {
                  message.success(summary);
                }
                onSuccess?.(result);
                await load();
              } catch (error) {
                const reason = error instanceof Error ? error : new Error("导入失败");
                message.error(reason.message);
                onError?.(reason);
              } finally {
                setImporting(false);
              }
            }}
          >
            <Button loading={importing}>导入 Excel</Button>
          </Upload>
          <Button
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadFile(`/api/personnel/export${filterQuery(applied)}`, "人员信息.xlsx");
              } catch (error) {
                message.error(error instanceof Error ? error.message : "导出失败");
              } finally {
                setExporting(false);
              }
            }}
          >
            导出 Excel
          </Button>
          <Button
            loading={packing}
            onClick={async () => {
              if (getUser()?.role !== "admin") {
                message.error("只有管理员可以下载");
                return;
              }
              setPacking(true);
              try {
                const all = await api<PersonnelItem[]>("/api/personnel");
                if (!all.length) {
                  message.warning("暂无人员");
                  return;
                }
                await downloadPersonnelQrZip(all);
                message.success(`已下载 ${all.length} 人的姓名和二维码`);
              } catch (error) {
                message.error(error instanceof Error ? error.message : "下载失败");
              } finally {
                setPacking(false);
              }
            }}
          >
            下载全部二维码
          </Button>
          <Button type="primary" onClick={() => openEditor(null)}>
            新建人员
          </Button>
        </div>
      </div>
      <div className="filter-bar">
        <Input
          allowClear
          placeholder="姓名"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="性别"
          value={draft.gender}
          onChange={(event) => setDraft({ ...draft, gender: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="身份证号"
          value={draft.idCard}
          onChange={(event) => setDraft({ ...draft, idCard: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="联系电话"
          value={draft.phone}
          onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="人员类别，如党员"
          value={draft.tag}
          onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="更新日期，如 2026-10"
          value={draft.infoDate}
          onChange={(event) => setDraft({ ...draft, infoDate: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="状态，启用或停用"
          value={draft.status}
          onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Input
          allowClear
          placeholder="采集人"
          value={draft.collector}
          onChange={(event) => setDraft({ ...draft, collector: event.target.value })}
          onPressEnter={() => setApplied(draft)}
        />
        <Space>
          <Button type="primary" onClick={() => setApplied(draft)}>
            查询
          </Button>
          <Button
            onClick={() => {
              setDraft(emptyFilters);
              setApplied(emptyFilters);
            }}
          >
            重置
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        scroll={{ x: 1360 }}
        dataSource={people}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "头像",
            dataIndex: "avatar",
            width: 72,
            render: (value: string, record) =>
              value ? <Avatar src={avatarSrc(value)} /> : <Avatar>{record.name.slice(0, 1)}</Avatar>,
          },
          { title: "姓名", dataIndex: "name", width: 100 },
          { title: "性别", dataIndex: "gender", width: 70, render: (value: string) => value || "-" },
          { title: "身份证号", dataIndex: "id_card", width: 190, render: (value: string) => value || "-" },
          { title: "联系电话", dataIndex: "phone", width: 140, render: (value: string) => value || "-" },
          {
            title: "人员类别",
            dataIndex: "tags",
            render: (value: string[]) =>
              value?.length ? value.map((tag) => <Tag key={tag}>{tag}</Tag>) : "-",
          },
          {
            title: "更新日期",
            dataIndex: "info_date",
            width: 120,
            render: (value: string) => value || "-",
          },
          { title: "采集人", dataIndex: "collector", width: 110, render: (value: string) => value || "-" },
          {
            title: "状态",
            dataIndex: "status",
            width: 80,
            render: (value: number) => (value === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
          },
          {
            title: "操作",
            width: 250,
            render: (_, record) => (
              <Space wrap>
                <Button type="link" onClick={() => setQrPerson(record)}>
                  二维码
                </Button>
                <Button type="link" onClick={() => openEditor(record)}>
                  编辑
                </Button>
                <Button type="link" onClick={() => toggleStatus(record)}>
                  {record.status === 1 ? "停用" : "启用"}
                </Button>
                <Popconfirm title="删除后二维码将失效" onConfirm={() => remove(record)}>
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "编辑人员" : "新建人员"}
        open={open}
        width={880}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "hidden" } }}
      >
        <Form
          form={form}
          layout="vertical"
          className="person-form-grid"
          onFinish={async (values) => {
            const payload = {
              ...values,
              birthDate: values.birthDate ? values.birthDate.format("YYYY-MM-DD") : "",
              infoDate: values.infoDate ? values.infoDate.format("YYYY-MM-DD") : "",
              tags: values.tags || [],
            };
            try {
              if (editing) {
                await api(`/api/personnel/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
              } else {
                await api("/api/personnel", { method: "POST", body: JSON.stringify(payload) });
              }
              message.success("已保存");
              setOpen(false);
              await load();
            } catch (error) {
              message.error(error instanceof Error ? error.message : "保存失败");
            }
          }}
        >
          <Form.Item className="span-2" label="头像" name="avatar">
            <AvatarField />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请填写姓名" }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select allowClear options={toOptions(choices.gender)} />
          </Form.Item>
          <Form.Item
            label="身份证号"
            name="idCard"
            rules={[{ pattern: /^$|^(\d{15}|\d{17}[\dXx])$/, message: "身份证号格式不正确" }]}
          >
            <Input
              maxLength={18}
              onBlur={(event) => {
                const matched = event.target.value.trim().match(/^(\d{6})(\d{4})(\d{2})(\d{2})/);
                if (!matched || form.getFieldValue("birthDate")) return;
                const date = dayjs(`${matched[2]}-${matched[3]}-${matched[4]}`);
                if (date.isValid()) form.setFieldValue("birthDate", date);
              }}
            />
          </Form.Item>
          <Form.Item label="出生日期" name="birthDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="民族" name="ethnicity">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item className="span-2" label="户籍地址" name="householdAddress">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item className="span-2" label="现居住地址" name="residenceAddress">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item label="家庭户号" name="householdNo">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label="文化程度" name="education">
            <Select allowClear options={toOptions(choices.education)} />
          </Form.Item>
          <Form.Item label="婚姻状况" name="maritalStatus">
            <Select allowClear options={toOptions(choices.marital)} />
          </Form.Item>
          <Form.Item label="健康状况" name="healthStatus">
            <Select allowClear options={toOptions(choices.health)} />
          </Form.Item>
          <Form.Item label="就业情况" name="employmentStatus">
            <Select allowClear options={toOptions(choices.employment)} />
          </Form.Item>
          <Form.Item label="务工地点" name="workLocation">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item label="参保情况" name="insuranceStatus">
            <Select allowClear options={toOptions(choices.insurance)} />
          </Form.Item>
          <Form.Item className="span-2" label="人员类别" name="tags">
            <Select mode="multiple" allowClear options={toOptions(personTagOptions)} placeholder="党员、低保、残疾等" />
          </Form.Item>
          <Form.Item className="span-2" label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item label="更新日期" name="infoDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="采集人" name="collector">
            <Input maxLength={50} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="人员二维码" open={!!qrPerson} footer={null} onCancel={() => setQrPerson(null)}>
        {qrPerson && (
          <div className="qr-box">
            <QRCodeSVG value={personLink(qrPerson.code)} size={196} />
            <div className="qr-code">{qrPerson.code}</div>
            <Typography.Text type="secondary">{qrPerson.name}</Typography.Text>
            <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
              {personLink(qrPerson.code)}
            </Typography.Paragraph>
            <Typography.Text type="secondary">手机扫码后打开这个网址，只能查看人员信息。</Typography.Text>
          </div>
        )}
      </Modal>
    </div>
  );
}
