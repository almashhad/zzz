import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Beaker } from 'lucide-react';
import { theoreticalSpreadRate, practicalSpreadRate, litersPerSqmPerCoat, wftFromDft, isWithinDewPointSafety, costPerSqmFromGallon } from '@/lib/engine';

const lossMap: Record<string, number> = { 'airless': 0.9, 'roller': 0.85, 'brush': 0.82 };

export default function EngineeringPanel() {
  const [vs, setVs] = useState<number>(0.4);
  const [dft, setDft] = useState<number>(35);
  const [app, setApp] = useState<'airless'|'roller'|'brush'>('roller');
  const [rh, setRh] = useState<number>(55);
  const [ts, setTs] = useState<number>(30);
  const [gallonPrice, setGallonPrice] = useState<number>(70);
  const [covPerGallon, setCovPerGallon] = useState<number>(40);

  const tsr = useMemo(()=> theoreticalSpreadRate(vs, dft), [vs,dft]);
  const psr = useMemo(()=> practicalSpreadRate(tsr, lossMap[app]), [tsr,app]);
  const lpm2 = useMemo(()=> litersPerSqmPerCoat(psr), [psr]);
  const wft = useMemo(()=> wftFromDft(dft, vs), [dft,vs]);
  const dew = useMemo(()=> isWithinDewPointSafety(ts, rh), [ts,rh]);
  const costPerSqm = useMemo(()=> costPerSqmFromGallon(gallonPrice, covPerGallon), [gallonPrice, covPerGallon]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5" /> الوضع الهندسي (DFT / VS / WFT)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>نسبة المواد الصلبة VS (0–1)</Label>
            <Input type="number" step="0.01" min="0.1" max="0.8" value={vs} onChange={e=>setVs(parseFloat(e.target.value)||0)} />
          </div>
          <div>
            <Label>السماكة الجافة DFT (µm)</Label>
            <Input type="number" step="1" min="5" max="400" value={dft} onChange={e=>setDft(parseFloat(e.target.value)||0)} />
          </div>
          <div>
            <Label>طريقة التطبيق</Label>
            <Select value={app} onValueChange={v=>setApp(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="airless">Airless</SelectItem>
                <SelectItem value="roller">Roller</SelectItem>
                <SelectItem value="brush">Brush</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">تُطبّق فواقد تلقائيًا حسب الطريقة</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat title="TSR (م²/لتر)" value={psr.toFixed(2)} sub="فعلي بعد الفواقد" />
          <Stat title="لتر/م²/وجه" value={lpm2.toFixed(3)} sub="لكل طبقة" />
          <Stat title="WFT (µm)" value={wft.toFixed(0)} sub="سماكة رطبة مستهدفة" />
          <Stat title="تكلفة المواد/م²" value={costPerSqm.toFixed(2)} sub="من سعر/تغطية الجالون" />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>حرارة السطح °C</Label>
            <Input type="number" step="0.5" value={ts} onChange={e=>setTs(parseFloat(e.target.value)||0)} />
          </div>
          <div>
            <Label>الرطوبة RH %</Label>
            <Input type="number" step="1" min="1" max="100" value={rh} onChange={e=>setRh(parseFloat(e.target.value)||0)} />
          </div>
          <div className="flex items-end">
            {dew.ok ? (
              <Badge>آمن: Δ = {dew.delta.toFixed(1)}°C</Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-1"><AlertCircle className="h-3 w-3" /> خطر ندى</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({title, value, sub}:{title:string, value:string, sub?:string}) {
  return (
    <div className="p-4 rounded-2xl border">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
