import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Zap, Droplets, Wifi, Car, PawPrint, Calculator, TrendingUp } from "lucide-react";

interface CostCalculatorProps {
  monthlyRent: number;
  securityDeposit?: number;
  petDeposit?: number;
  parkingFee?: number;
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
}

export function CostCalculator({
  monthlyRent,
  securityDeposit = monthlyRent,
  petDeposit = 500,
  parkingFee = 150,
  petsAllowed = false,
  parkingIncluded = false,
}: CostCalculatorProps) {
  const [includePet, setIncludePet] = useState(false);
  const [includeParking, setIncludeParking] = useState(false);
  const [utilitiesEstimate, setUtilitiesEstimate] = useState(150);
  const [rentersInsurance, setRentersInsurance] = useState(30);

  const monthlyTotal = monthlyRent + 
    utilitiesEstimate + 
    rentersInsurance +
    (includeParking && !parkingIncluded ? parkingFee : 0) +
    (includePet && petsAllowed ? 50 : 0);

  const moveInTotal = securityDeposit + 
    monthlyRent + 
    (includePet && petsAllowed ? petDeposit : 0) +
    (includeParking && !parkingIncluded ? parkingFee : 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <CardHeader className="pb-4">
        <div className="space-y-1 mb-2">
          <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Estimated Costs</Badge>
          <CardTitle className="flex items-center gap-2 text-2xl font-black">
            <Calculator className="h-6 w-6 text-primary" />
            Monthly Budget Planner
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 dark:bg-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Monthly Total</p>
            <p className="text-2xl font-bold text-primary" data-testid="text-monthly-total">
              {formatCurrency(monthlyTotal)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
            <p className="text-sm text-muted-foreground mb-1">Move-in Cost</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-movein-total">
              {formatCurrency(moveInTotal)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Monthly Breakdown</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-800">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span>Base Rent</span>
              </div>
              <span className="font-semibold">{formatCurrency(monthlyRent)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Utilities Estimate</span>
                </div>
                <span className="font-semibold">{formatCurrency(utilitiesEstimate)}</span>
              </div>
              <Slider
                value={[utilitiesEstimate]}
                onValueChange={(value) => setUtilitiesEstimate(value[0])}
                min={50}
                max={300}
                step={10}
                className="w-full"
                data-testid="slider-utilities"
              />
              <p className="text-xs text-muted-foreground">Adjust based on your usage</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>Renter's Insurance</span>
                </div>
                <span className="font-semibold">{formatCurrency(rentersInsurance)}</span>
              </div>
              <Slider
                value={[rentersInsurance]}
                onValueChange={(value) => setRentersInsurance(value[0])}
                min={15}
                max={75}
                step={5}
                className="w-full"
                data-testid="slider-insurance"
              />
            </div>

            {petsAllowed && (
              <div className="flex justify-between items-center py-2 border-t dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-orange-500" />
                  <span>Pet Rent</span>
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${includePet ? '' : 'text-muted-foreground'}`}>
                    {includePet ? '+$50/mo' : '$0'}
                  </span>
                  <Switch
                    checked={includePet}
                    onCheckedChange={setIncludePet}
                    data-testid="switch-pet"
                  />
                </div>
              </div>
            )}

            {!parkingIncluded && (
              <div className="flex justify-between items-center py-2 border-t dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-purple-500" />
                  <span>Parking</span>
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${includeParking ? '' : 'text-muted-foreground'}`}>
                    {includeParking ? formatCurrency(parkingFee) : '$0'}
                  </span>
                  <Switch
                    checked={includeParking}
                    onCheckedChange={setIncludeParking}
                    data-testid="switch-parking"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t dark:border-gray-800">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Move-in Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>First Month's Rent</span>
              <span className="font-medium">{formatCurrency(monthlyRent)}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Deposit</span>
              <span className="font-medium">{formatCurrency(securityDeposit)}</span>
            </div>
            {includePet && petsAllowed && (
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>Pet Deposit</span>
                <span className="font-medium">{formatCurrency(petDeposit)}</span>
              </div>
            )}
            {includeParking && !parkingIncluded && (
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>First Month Parking</span>
                <span className="font-medium">{formatCurrency(parkingFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t dark:border-gray-800 text-base font-bold">
              <span>Total Due at Move-in</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(moveInTotal)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
