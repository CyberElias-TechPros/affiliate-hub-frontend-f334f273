import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Wallet, DollarSign, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/CustomInput";
import { toast } from "sonner";
import { WalletAPI, ProfileAPI, getErrorMessage, WithdrawMethod } from "@/lib/api";

type Method = "bank" | "usdt" | "paypal";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<Method>("bank");
  const [step, setStep] = React.useState(1);
  const [details, setDetails] = React.useState<Record<string, string>>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    usdtAddress: "",
    paypalEmail: "",
  });

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance"],
    queryFn: WalletAPI.balance,
  });

  const { data: methodsData, isLoading: methodsLoading } = useQuery({
    queryKey: ["withdraw-methods"],
    queryFn: WalletAPI.methods,
  });

  // Prefill payout details from saved profile bank info.
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: ProfileAPI.get,
  });
  React.useEffect(() => {
    const bank = profileData?.bank;
    if (!bank) return;
    setDetails((prev) => ({
      ...prev,
      bankName: prev.bankName || bank.bankName || "",
      accountName: prev.accountName || bank.accountName || "",
      accountNumber: prev.accountNumber || bank.accountNumber || "",
      usdtAddress: prev.usdtAddress || bank.usdtAddress || "",
      paypalEmail: prev.paypalEmail || bank.paypalEmail || "",
    }));
  }, [profileData]);

  const withdrawMutation = useMutation({
    mutationFn: WalletAPI.withdraw,
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate("/wallet");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const availableBalance = Math.max(0, balanceData?.ngnBalance ?? 0);
  const locked = balanceData?.locked ?? 0;
  const amountNum = parseFloat(amount.replace(/,/g, "")) || 0;

  const methods = methodsData ?? [
    { id: "bank", label: "Bank Transfer (NGN)", minAmount: 1000, fee: 0, time: "24-48 hours" },
    { id: "usdt", label: "USDT (TRC20)", minAmount: 5000, fee: 1, time: "1-6 hours" },
    { id: "paypal", label: "PayPal (USD)", minAmount: 5000, fee: 2.5, time: "24-72 hours" },
  ] as WithdrawMethod[];

  const selectedMethod = methods.find((m) => m.id === method) || methods[0];
  const minAmount = selectedMethod?.minAmount ?? 1000;
  const feeAmount = Math.round(amountNum * ((selectedMethod?.fee ?? 0) / 100) * 100) / 100;
  const netAmount = Math.max(0, amountNum - feeAmount);
  const isValidAmount = amountNum >= minAmount && amountNum <= availableBalance;

  const detailsValid =
    method === "bank"
      ? /^\d{10}$/.test(details.accountNumber) && !!details.bankName.trim() && !!details.accountName.trim()
      : method === "usdt"
      ? !!details.usdtAddress.trim()
      : /^\S+@\S+\.\S+$/.test(details.paypalEmail);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value ? parseInt(value).toLocaleString() : "");
  };

  const handleWithdraw = () => {
    if (!detailsValid) return;
    withdrawMutation.mutate({
      amount: amountNum,
      method,
      details,
    });
  };

  const withdrawMethods: Array<WithdrawMethod & { icon: typeof Building2 }> = methods.map((m) => ({
    ...m,
    icon: m.id === "bank" ? Building2 : m.id === "usdt" ? DollarSign : Wallet,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold font-display">Withdraw Funds</h1>
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? "gradient-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground mb-2">
                Enter amount
              </h2>
              <p className="text-muted-foreground">
                {balanceLoading ? (
                  <span className="animate-pulse bg-muted h-4 w-24 inline-block" />
                ) : (
                  <>
                    Available: <span className="text-foreground font-medium">₦{availableBalance.toLocaleString()}</span>
                    {locked > 0 && (
                      <span className="text-muted-foreground/70"> (₦{locked.toLocaleString()} in review)</span>
                    )}
                  </>
                )}
              </p>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full h-16 pl-12 pr-4 text-3xl font-bold text-foreground bg-card border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              {amount && !isValidAmount && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {amountNum < minAmount
                    ? `Minimum withdrawal for ${selectedMethod?.label ?? "this method"} is ₦${minAmount.toLocaleString()}`
                    : `Insufficient balance (available: ₦${availableBalance.toLocaleString()})`}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[10000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toLocaleString())}
                  className="flex-1 min-w-[70px] py-2 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  ₦{(preset / 1000)}K
                </button>
              ))}
              <button
                onClick={() => setAmount(availableBalance.toLocaleString())}
                className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
              >
                Max
              </button>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!isValidAmount}
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow disabled:opacity-50"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground mb-2">
                Select method
              </h2>
              <p className="text-muted-foreground">Choose how you want to receive your funds</p>
            </div>

            <div className="space-y-3">
              {withdrawMethods.map((m) => {
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <m.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">{m.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Min ₦{m.minAmount.toLocaleString()} · {m.fee}% fee · {m.time}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setStep(3)}
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground mb-2">
                Confirm withdrawal
              </h2>
              <p className="text-muted-foreground">Review the details and confirm</p>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground text-lg">₦{amount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium text-foreground">
                  {withdrawMethods.find((m) => m.id === method)?.label}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Fee ({selectedMethod?.fee}%)</span>
                <span className="font-medium text-warning">-₦{feeAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">You'll receive</span>
                <span className="font-bold text-primary text-xl">₦{netAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              {method === "bank" && (
                <>
                  <CustomInput
                    label="Bank Name"
                    placeholder="e.g. GTBank"
                    value={details.bankName}
                    onChange={(e) => setDetails((d) => ({ ...d, bankName: e.target.value }))}
                    error={details.bankName && !details.bankName.trim() ? "Bank name is required" : undefined}
                  />
                  <CustomInput
                    label="Account Name"
                    placeholder="Account holder's full name"
                    value={details.accountName}
                    onChange={(e) => setDetails((d) => ({ ...d, accountName: e.target.value }))}
                    error={details.accountName && !details.accountName.trim() ? "Account name is required" : undefined}
                  />
                  <CustomInput
                    label="Account Number (10 digits)"
                    placeholder="0123456789"
                    inputMode="numeric"
                    maxLength={10}
                    value={details.accountNumber}
                    onChange={(e) => setDetails((d) => ({ ...d, accountNumber: e.target.value.replace(/[^0-9]/g, "") }))}
                    error={details.accountNumber && !/^\d{10}$/.test(details.accountNumber) ? "Enter a valid 10-digit account number" : undefined}
                  />
                </>
              )}
              {method === "usdt" && (
                <CustomInput
                  label="USDT (TRC20) Wallet Address"
                  placeholder="TXxxxx..."
                  value={details.usdtAddress}
                  onChange={(e) => setDetails((d) => ({ ...d, usdtAddress: e.target.value }))}
                  error={details.usdtAddress && details.usdtAddress.trim().length < 20 ? "Enter a valid TRC20 address" : undefined}
                />
              )}
              {method === "paypal" && (
                <CustomInput
                  label="PayPal Email"
                  type="email"
                  placeholder="you@example.com"
                  value={details.paypalEmail}
                  onChange={(e) => setDetails((d) => ({ ...d, paypalEmail: e.target.value }))}
                  error={details.paypalEmail && !/^\S+@\S+\.\S+$/.test(details.paypalEmail) ? "Enter a valid email" : undefined}
                />
              )}
              <button
                onClick={() => navigate("/profile")}
                className="text-sm text-primary hover:underline"
              >
                Save these details to my profile →
              </button>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending || !detailsValid}
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow disabled:opacity-50"
            >
              {withdrawMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </div>
              ) : detailsValid ? (
                "Confirm Withdrawal"
              ) : (
                "Complete payout details"
              )}
            </Button>
            {methodsLoading && (
              <p className="text-center text-xs text-muted-foreground">Loading methods…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;
