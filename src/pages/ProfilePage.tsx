import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Building2, Shield, Moon, Bell, HelpCircle,
  LogOut, ChevronRight, MessageCircle, FileText, Loader2, ExternalLink,
  Users, Trophy,
} from "lucide-react";
import { MenuItem } from "@/components/ui/MenuItem";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/layout/BottomNav";
import { CustomInput } from "@/components/ui/CustomInput";
import { CountryDropdown } from "@/components/ui/CountryDropdown";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ProfileAPI, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

const NOTIF_KEY = "ah_notifications_enabled";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [notifications, setNotifications] = React.useState(
    () => localStorage.getItem(NOTIF_KEY) !== "off"
  );
  const [activeSheet, setActiveSheet] = React.useState<
    null | "personal" | "bank" | "security"
  >(null);

  const queryClient = useQueryClient();
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: ProfileAPI.get,
    enabled: !!user,
  });

  const handleLogout = () => logout();

  const toggleNotifications = (checked: boolean) => {
    setNotifications(checked);
    localStorage.setItem(NOTIF_KEY, checked ? "on" : "off");
  };

  const userInitials = user?.name?.split(" ").map((n) => n[0]).join("") ?? "U";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Profile Header */}
      <div className="px-4 pt-6 pb-8 gradient-hero">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold shadow-glow">
            {userInitials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold font-display text-foreground">{user?.name ?? "User"}</h1>
            <p className="text-muted-foreground">{user?.email ?? ""}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                {user?.role === "admin" ? "Admin" : "Affiliate"}
              </span>
            </div>
          </div>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Account Section */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">Account</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <MenuItem
            icon={<User className="h-5 w-5" />}
            title="Personal Information"
            subtitle="Name, email, phone"
            onClick={() => setActiveSheet("personal")}
          />
          <MenuItem
            icon={<Building2 className="h-5 w-5" />}
            title="Bank & Payout Details"
            subtitle="Bank, USDT, PayPal"
            onClick={() => setActiveSheet("bank")}
          />
          <MenuItem
            icon={<Shield className="h-5 w-5" />}
            title="Security"
            subtitle="Change password"
            onClick={() => setActiveSheet("security")}
          />
        </div>
      </div>

      {/* Growth Section */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">Growth</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <MenuItem
            icon={<Users className="h-5 w-5" />}
            title="Referral Program"
            subtitle="Invite friends, earn bonuses"
            onClick={() => navigate("/referrals")}
          />
          <MenuItem
            icon={<Trophy className="h-5 w-5" />}
            title="Achievements"
            subtitle="Badges & streaks"
            onClick={() => navigate("/achievements")}
          />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">Preferences</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <MenuItem
            icon={<Moon className="h-5 w-5" />}
            title="Dark Mode"
            subtitle={theme === "dark" ? "On" : "Off"}
            showArrow={false}
            rightElement={<Switch checked={theme === "dark"} onCheckedChange={toggle} />}
          />
          <MenuItem
            icon={<Bell className="h-5 w-5" />}
            title="Notifications"
            showArrow={false}
            rightElement={
              <Switch checked={notifications} onCheckedChange={toggleNotifications} />
            }
          />
        </div>
      </div>

      {/* Support Section */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">Support</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <MenuItem icon={<HelpCircle className="h-5 w-5" />} title="Help & FAQ" onClick={() => navigate("/help")} />
          <MenuItem
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat with Support"
            subtitle="via WhatsApp"
            onClick={() => window.open("https://wa.me/2348012345678", "_blank")}
          />
          <MenuItem
            icon={<FileText className="h-5 w-5" />}
            title="Terms & Privacy"
            rightElement={<ExternalLink className="h-4 w-4 text-muted-foreground" />}
            showArrow={false}
            onClick={() => navigate("/terms")}
          />
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <MenuItem
            icon={<LogOut className="h-5 w-5" />}
            title="Log Out"
            destructive
            showArrow={false}
            onClick={handleLogout}
          />
        </div>
      </div>

      {/* Version */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">Affiliate Hub v1.0.0</p>
      </div>

      <BottomNav />

      {/* ---- Sheets ---- */}
      <PersonalSheet
        open={activeSheet === "personal"}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        initialUser={user}
      />
      <BankSheet
        open={activeSheet === "bank"}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        initialBank={profileData?.bank ?? null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile"] })}
      />
      <SecuritySheet
        open={activeSheet === "security"}
        onOpenChange={(o) => !o && setActiveSheet(null)}
      />
    </div>
  );
};

// ---------- Personal information ----------
const PersonalSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser: ReturnType<typeof useAuth>["user"];
}> = ({ open, onOpenChange, initialUser }) => {
  const { setUser } = useAuth();
  const [form, setForm] = React.useState({ name: "", phone: "", whatsapp: "", country: "NG", niche: "" });
  const mutation = useMutation({
    mutationFn: () => ProfileAPI.update(form),
    onSuccess: ({ user }) => {
      setUser(user);
      toast.success("Profile updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: initialUser?.name ?? "",
        phone: initialUser?.phone ?? "",
        whatsapp: initialUser?.whatsapp ?? "",
        country: initialUser?.country ?? "NG",
        niche: initialUser?.niche ?? "",
      });
    }
  }, [open, initialUser]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Personal Information</SheetTitle>
          <SheetDescription>Update your profile details</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <CustomInput
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <CustomInput
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <CustomInput
            label="WhatsApp Number"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
          <CountryDropdown
            label="Country"
            value={form.country as never}
            onChange={(country) => setForm((f) => ({ ...f, country }))}
          />
          <CustomInput
            label="Primary Niche"
            value={form.niche}
            onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
          />
          <Button
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
            disabled={mutation.isPending || !form.name.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ---------- Bank & payout details ----------
const BankSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBank: { bankName?: string; accountName?: string; accountNumber?: string; usdtAddress?: string; paypalEmail?: string } | null;
  onSaved: () => void;
}> = ({ open, onOpenChange, initialBank, onSaved }) => {
  const [form, setForm] = React.useState({
    bankName: "", accountName: "", accountNumber: "",
    usdtAddress: "", paypalEmail: "",
  });
  const mutation = useMutation({
    mutationFn: () => ProfileAPI.updateBank(form),
    onSuccess: () => {
      toast.success("Payout details saved");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        bankName: initialBank?.bankName ?? "",
        accountName: initialBank?.accountName ?? "",
        accountNumber: initialBank?.accountNumber ?? "",
        usdtAddress: initialBank?.usdtAddress ?? "",
        paypalEmail: initialBank?.paypalEmail ?? "",
      });
    }
  }, [open, initialBank]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Bank & Payout Details</SheetTitle>
          <SheetDescription>Used to process withdrawals</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <CustomInput
            label="Bank Name"
            placeholder="e.g. GTBank"
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          />
          <CustomInput
            label="Account Name"
            placeholder="Account holder's full name"
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
          />
          <CustomInput
            label="Account Number (10 digits)"
            inputMode="numeric"
            maxLength={10}
            placeholder="0123456789"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/[^0-9]/g, "") }))}
          />
          <CustomInput
            label="USDT (TRC20) Address"
            placeholder="TXxxxx..."
            value={form.usdtAddress}
            onChange={(e) => setForm((f) => ({ ...f, usdtAddress: e.target.value }))}
          />
          <CustomInput
            label="PayPal Email"
            type="email"
            placeholder="you@example.com"
            value={form.paypalEmail}
            onChange={(e) => setForm((f) => ({ ...f, paypalEmail: e.target.value }))}
          />
          <Button
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Details"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ---------- Security ----------
const SecuritySheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const mutation = useMutation({
    mutationFn: () => ProfileAPI.updateSecurity(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      onOpenChange(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const valid =
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Change Password</SheetTitle>
          <SheetDescription>
            {newPassword !== confirmPassword && confirmPassword
              ? "Passwords do not match"
              : "Use at least 6 characters"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <CustomInput
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <CustomInput
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={newPassword && newPassword.length < 6 ? "Min 6 characters" : undefined}
          />
          <CustomInput
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword && confirmPassword !== newPassword ? "Passwords do not match" : undefined}
          />
          <Button
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl"
            disabled={mutation.isPending || !valid}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfilePage;
