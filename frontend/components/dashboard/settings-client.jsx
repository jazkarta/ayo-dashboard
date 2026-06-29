"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import settingsService from "@/services/settingsService";
import { useUser } from "@/context/UserContext";
import {
  Mail,
  Globe,
  Server,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Info,
  Shield,
  Lock,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex rounded-md border border-input overflow-hidden w-fit">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 py-1.5 text-sm font-medium transition-colors ${
          value === true
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-5 py-1.5 text-sm font-medium transition-colors border-l border-input ${
          value === false
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        No
      </button>
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder, className, required }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-10 ${className}`}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={visible ? "Hide" : "Show"}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
        )}
      </div>
    </div>
  );
}

// ─── Email Section ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  email_host: "",
  email_port: "",
  email_use_tls: true,
  email_use_ssl: false,
  email_host_user: "",
  password: "",
  default_from_email: "",
  is_active: false,
};

function EmailSection() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [originalForm, setOriginalForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await settingsService.getEmailConfigurations();
      setConfigs(data.results);
    } catch (error) {
      console.error("[EmailSection] Failed to load email configurations", error);
      toast.error("Failed to load email configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFormErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (cfg) => {
    setEditingId(cfg.id);
    setForm({ ...cfg });
    setOriginalForm({ ...cfg });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  const [saving, setSaving] = useState(false);
  const [testTarget, setTestTarget] = useState(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const openTestDialog = (cfg) => {
    setTestTarget(cfg);
    setTestRecipient("");
    setTestResult(null);
  };

  const closeTestDialog = () => {
    if (testSending) return;
    setTestTarget(null);
    setTestResult(null);
  };

  const handleSendTestEmail = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      await settingsService.sendTestEmail(testTarget.id, { recipient_email: testRecipient });
      setTestResult({ type: "success", message: "Test email sent successfully." });
    } catch (error) {
      console.error("[EmailSection] Failed to send test email", error);
      const responseData = error?.response?.data;
      const message = Array.isArray(responseData?.non_field_errors)
        ? responseData.non_field_errors.join(" ")
        : Array.isArray(responseData?.recipient_email)
        ? responseData.recipient_email.join(" ")
        : responseData?.detail || responseData?.message || "Failed to send test email.";
      setTestResult({ type: "error", message });
    } finally {
      setTestSending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const changedFields = Object.fromEntries(
          Object.entries(form).filter(([key, val]) => val !== originalForm[key])
        );
        await settingsService.updateEmailConfiguration(editingId, changedFields);
        toast.success("Email configuration updated successfully.");
      } else {
        await settingsService.createEmailConfiguration(form);
        toast.success("Email configuration saved successfully.");
      }
      handleCancel();
      await fetchConfigs();
    } catch (error) {
      console.error("[EmailSection] Failed to save email configuration", error);
      const responseData = error?.response?.data;
      const FIELD_KEYS = ["name", "email_host", "email_port", "email_host_user", "password", "default_from_email"];
      const fieldErrors = {};
      FIELD_KEYS.forEach((key) => {
        if (Array.isArray(responseData?.[key])) fieldErrors[key] = responseData[key].join(" ");
      });
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
      } else {
        const message = Array.isArray(responseData?.non_field_errors)
          ? responseData.non_field_errors.join(" ")
          : responseData?.detail || responseData?.message || "Failed to save email configuration.";
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await settingsService.deleteEmailConfiguration(id);
      toast.success("Email configuration deleted.");
      if (editingId === id) handleCancel();
      await fetchConfigs();
    } catch (error) {
      console.error("[EmailSection] Failed to delete email configuration", error);
      toast.error("Failed to delete email configuration.");
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await settingsService.activateEmailConfiguration(id);
      await fetchConfigs();
    } catch (error) {
      console.error("[EmailSection] Failed to activate email configuration", error);
      toast.error("Failed to update active configuration.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Email Configuration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage SMTP email provider configurations for your platform.
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Add Configuration
        </Button>
      </div>

      {/* Info alert */}
      <Alert className="border-blue-200 bg-blue-50/60 text-blue-900">
        <Info className="text-blue-500" />
        <AlertDescription className="text-blue-800/80">
          If no configuration is marked as active, the platform will fall back to
          the server&apos;s built-in default email settings.
        </AlertDescription>
      </Alert>

      {/* Config table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Active Configurations</CardTitle>
          <CardDescription className="text-xs">
            Manage and monitor your email provider configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              Loading configurations...
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center mb-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No email configurations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Get started by adding your first email configuration.
              </p>
              <Button size="sm" variant="outline" onClick={openAdd} className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Configuration
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((cfg) => (
                  <TableRow
                    key={cfg.id}
                    className={editingId === cfg.id ? "bg-muted/40" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cfg.name}</span>
                        {cfg.is_active && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 font-medium border-green-500/40 text-green-600 bg-green-50"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cfg.email_host}:{cfg.email_port}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cfg.email_use_tls ? "TLS" : cfg.email_use_ssl ? "SSL" : "None"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {cfg.is_active ? "True" : "False"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cfg.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => openTestDialog(cfg)}
                          >
                            <Send className="h-3 w-3" />
                            Send Test Email
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(cfg)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &quot;{cfg.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This configuration will be permanently removed. This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(cfg.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {editingId ? `Edit: ${form.name || "Configuration"}` : "New Configuration"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Fill in the SMTP details for this provider
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Configuration Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-name" className="text-xs font-medium">
                Configuration Name <span className="text-destructive text-sm font-bold">*</span>
              </Label>
              <Input
                id="cfg-name"
                placeholder="e.g. SendGrid Production"
                className={`h-9 text-sm ${formErrors.name ? "border-destructive" : ""}`}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
              {formErrors.name
                ? <p className="text-xs text-destructive">{formErrors.name}</p>
                : <p className="text-xs text-muted-foreground">A friendly name to identify this configuration</p>
              }
            </div>

            {/* Host + Port */}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-host" className="text-xs font-medium">
                  SMTP Host <span className="text-destructive text-sm font-bold">*</span>
                </Label>
                <Input
                  id="cfg-host"
                  placeholder="smtp.sendgrid.net"
                  className={`h-9 text-sm ${formErrors.email_host ? "border-destructive" : ""}`}
                  value={form.email_host}
                  onChange={(e) => setField("email_host", e.target.value)}
                  required
                />
                {formErrors.email_host
                  ? <p className="text-xs text-destructive">{formErrors.email_host}</p>
                  : <p className="text-xs text-muted-foreground">Your SMTP server hostname</p>
                }
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-port" className="text-xs font-medium">
                  Port <span className="text-destructive text-sm font-bold">*</span>
                </Label>
                <Input
                  id="cfg-port"
                  type="number"
                  placeholder="587"
                  className={`h-9 text-sm ${formErrors.email_port ? "border-destructive" : ""}`}
                  value={form.email_port}
                  onChange={(e) => setField("email_port", Number(e.target.value))}
                  required
                />
                {formErrors.email_port
                  ? <p className="text-xs text-destructive">{formErrors.email_port}</p>
                  : <p className="text-xs text-muted-foreground">SMTP server port</p>
                }
              </div>
            </div>

            {/* Username + Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-user" className="text-xs font-medium">
                  Username <span className="text-destructive text-sm font-bold">*</span>
                </Label>
                <Input
                  id="cfg-user"
                  placeholder="apikey"
                  className={`h-9 text-sm ${formErrors.email_host_user ? "border-destructive" : ""}`}
                  value={form.email_host_user}
                  onChange={(e) => setField("email_host_user", e.target.value)}
                  required
                />
                {formErrors.email_host_user
                  ? <p className="text-xs text-destructive">{formErrors.email_host_user}</p>
                  : <p className="text-xs text-muted-foreground">SMTP username or API key</p>
                }
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-pass" className="text-xs font-medium">
                  Password <span className="text-destructive text-sm font-bold">*</span>
                </Label>
                <PasswordInput
                  id="cfg-pass"
                  placeholder="••••••••"
                  className={`h-9 text-sm font-mono ${formErrors.password ? "border-destructive" : ""}`}
                  value={form.password}
                  onChange={(val) => setField("password", val)}
                  required
                />
                {formErrors.password
                  ? <p className="text-xs text-destructive">{formErrors.password}</p>
                  : <p className="text-xs text-muted-foreground">SMTP password or API key</p>
                }
              </div>
            </div>

            {/* Default From Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-from" className="text-xs font-medium">
                Default From Email <span className="text-destructive text-sm font-bold">*</span>
              </Label>
              <Input
                id="cfg-from"
                type="email"
                placeholder="no-reply@yourdomain.com"
                className={`h-9 text-sm ${formErrors.default_from_email ? "border-destructive" : ""}`}
                value={form.default_from_email}
                onChange={(e) => setField("default_from_email", e.target.value)}
                required
              />
              {formErrors.default_from_email
                ? <p className="text-xs text-destructive">{formErrors.default_from_email}</p>
                : <p className="text-xs text-muted-foreground">Default email address for outgoing messages</p>
              }
            </div>

            <Separator />

            {/* Security options — two panels */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold">Security Options</p>
                    <p className="text-xs text-muted-foreground">Configure connection security settings</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Use TLS</span>
                  <YesNoToggle
                    value={form.email_use_tls}
                    onChange={(val) => setField("email_use_tls", val)}
                  />
                </div>
              </div>
              <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold">SSL Options</p>
                    <p className="text-xs text-muted-foreground">Configure SSL connection settings</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Use SSL</span>
                  <YesNoToggle
                    value={form.email_use_ssl}
                    onChange={(val) => setField("email_use_ssl", val)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Set as Active */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Set as Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Make this configuration the active email provider.
                  </p>
                </div>
              </div>
              <Toggle
                id="cfg-active"
                checked={form.is_active}
                onChange={(val) => setField("is_active", val)}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-1 border-t border-border">
              <Button variant="outline" size="sm" onClick={handleCancel} className="mt-3">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="mt-3">
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                    Saving...
                  </>
                ) : (
                  editingId ? "Save Changes" : "Save Configuration"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Test Email dialog */}
      <AlertDialog open={testTarget !== null} onOpenChange={closeTestDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold">Send Test Email</AlertDialogTitle>
            <AlertDialogDescription>
              Verify that <span className="font-medium text-foreground">{testTarget?.name}</span> is working correctly by sending a test message.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="test-recipient" className="text-xs font-medium">
              Recipient email <span className="text-destructive text-sm font-bold">*</span>
            </Label>
            <Input
              id="test-recipient"
              type="email"
              placeholder="you@example.com"
              className="h-9 text-sm"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              disabled={testSending}
            />
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
              testResult.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-destructive border border-destructive/20"
            }`}>
              {testResult.type === "success"
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />
              }
              {testResult.message}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={testSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSendTestEmail(); }}
              disabled={testSending || !testRecipient}
            >
              {testSending ? (
                <>
                  <span className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                  Sending...
                </>
              ) : (
                "Send Test Email"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Web Search Section ───────────────────────────────────────────────────────

function WebSearchSection() {
  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data } = await settingsService.getGlobalConfigurations();
        const config = Array.isArray(data.results) ? data.results[0] : data;
        if (config) {
          setConfigId(config.id);
          setEnabled(config.web_search);
        }
      } catch (error) {
        console.error("[WebSearchSection] Failed to load global configuration", error);
        toast.error("Failed to load web search settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleToggle = async (val) => {
    setEnabled(val);
    setSaving(true);
    try {
      await settingsService.updateGlobalConfiguration(configId, { web_search: val });
      toast.success(`Web search ${val ? "enabled" : "disabled"}.`);
    } catch (error) {
      console.error("[WebSearchSection] Failed to update web search setting", error);
      toast.error("Failed to update web search setting.");
      setEnabled(!val);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            icon={Search}
            title="Web Search"
            description="Control whether the platform can perform live web searches"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              Loading...
            </div>
          ) : (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Enable web search</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allows the platform to fetch live results from the web during
                research and conversation tasks.
              </p>
            </div>
            <Toggle checked={enabled} onChange={handleToggle} id="web-search-toggle" />
          </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

// ─── Nav + Layout ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "email", label: "Email Configuration", icon: Mail, component: EmailSection },
  { id: "websearch", label: "Web Search", icon: Globe, component: WebSearchSection },
];

export default function SettingsClient() {
  const [activeId, setActiveId] = useState("email");
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user !== null && user?.is_admin_researcher !== true) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user?.is_admin_researcher !== true) return null;

  const ActiveSection = SECTIONS.find((s) => s.id === activeId)?.component;

  return (
    <div className="flex gap-8 min-h-full">
      {/* Left nav */}
      <div className="w-52 shrink-0">
        <div className="sticky top-0 flex flex-col gap-1">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">Settings</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Configure system-wide preferences for your platform.
            </p>
          </div>

          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveId(id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors w-full ${
                activeId === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-border shrink-0" />

      {/* Right content */}
      <div className="flex-1 min-w-0">
        {ActiveSection && <ActiveSection />}
      </div>
    </div>
  );
}
