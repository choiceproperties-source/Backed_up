import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Home, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState(350000);
  const [downPayment, setDownPayment] = useState(70000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const calculations = useMemo(() => {
    const principal = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const totalPaid = monthlyPayment * numberOfPayments;
    const totalInterest = totalPaid - principal;

    // Generate amortization schedule
    const schedule = [];
    let balance = principal;
    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      
      if (i % 12 === 0 || i === 1) {
        schedule.push({
          month: i,
          year: Math.ceil(i / 12),
          principalPayment,
          interestPayment,
          balance: Math.max(0, balance)
        });
      }
    }

    return { monthlyPayment, totalInterest, principal, schedule, totalPaid };
  }, [homePrice, downPayment, interestRate, loanTerm]);

  const downPaymentPercent = ((downPayment / homePrice) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TrendingUp className="h-8 w-8" />
            Mortgage Calculator
          </h1>
          <p className="text-white/90">See what your monthly payments could be</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Input Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="font-semibold mb-2 block">Home Price: ${homePrice.toLocaleString()}</label>
                  <Input 
                    type="range" 
                    min="50000" 
                    max="2000000"
                    step="10000"
                    value={homePrice}
                    onChange={(e) => setHomePrice(parseInt(e.target.value))}
                  />
                  <Input 
                    type="number" 
                    value={homePrice}
                    onChange={(e) => setHomePrice(parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="font-semibold mb-2 block">
                    Down Payment: ${downPayment.toLocaleString()} ({downPaymentPercent}%)
                  </label>
                  <Input 
                    type="range" 
                    min="0" 
                    max={homePrice}
                    step="5000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseInt(e.target.value))}
                  />
                  <Input 
                    type="number" 
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="font-semibold mb-2 block">Interest Rate: {interestRate.toFixed(2)}%</label>
                  <Input 
                    type="range" 
                    min="2"
                    max="12"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                  />
                  <Input 
                    type="number" 
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="font-semibold mb-2 block">Loan Term: {loanTerm} years</label>
                  <div className="flex gap-2">
                    {[15, 20, 30].map(term => (
                      <Button
                        key={term}
                        variant={loanTerm === term ? "default" : "outline"}
                        onClick={() => setLoanTerm(term)}
                        className="flex-1"
                      >
                        {term}yr
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Estimated Monthly Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <p className="text-5xl font-bold text-primary">
                    ${calculations.monthlyPayment.toFixed(2)}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">per month</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loan Amount</p>
                    <p className="font-bold text-lg">${calculations.principal.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Interest</p>
                    <p className="font-bold text-lg">${calculations.totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount Paid</p>
                    <p className="font-bold text-lg">${calculations.totalPaid.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loan Term</p>
                    <p className="font-bold text-lg">{loanTerm} years</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amortization Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Breakdown Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={calculations.schedule.slice(0, Math.min(loanTerm, 10))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `$${((value as number) / 1000).toFixed(0)}k`} />
                    <Bar dataKey="principalPayment" name="Principal" fill="#3b82f6" />
                    <Bar dataKey="interestPayment" name="Interest" fill="#fbbf24" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
