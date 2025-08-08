import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Users, Package, TrendingUp, Settings, AlertCircle, Clock, Target, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import EngineeringPanel from '@/components/EngineeringPanel';

// معدلات الإنتاج الفعلية في الإمارات (ساعة لكل متر مربع)
const PRODUCTION_RATES = {
  sanding: {
    walls: 0.20,        // الصنفرة - إعداد السطح قبل الدهان
    ceilings: 0.25,     // الصنفرة على الأسقف
    textured: 0.30      // الصنفرة على الأسطح المحببة
  },
  sealer: {
    walls: 0.10,        // السيلر - طبقة العزل الأولى بعد اللياسة
    ceilings: 0.15,     // السيلر على الأسقف
    textured: 0.18      // السيلر على الأسطح المحببة
  },
  primer: {
    walls: 0.08,        // البرايمر - طبقة الأساس
    ceilings: 0.12,     // البرايمر على الأسقف
    textured: 0.15      // البرايمر على الأسطح المحببة
  },
  skimcoat1: {
    walls: 0.25,        // سكينة رقم 1 - التسوية الأولى
    ceilings: 0.30,     // سكينة رقم 1 على الأسقف
    textured: 0.35      // سكينة رقم 1 على الأسطح المحببة
  },
  skimcoat2: {
    walls: 0.20,        // سكينة رقم 2 - التسوية الثانية
    ceilings: 0.25,     // سكينة رقم 2 على الأسقف
    textured: 0.30      // سكينة رقم 2 على الأسطح المحببة
  },
  basecoat: {
    walls: 0.12,        // الطبقة الأساسية الأولى
    ceilings: 0.18,     // الطبقة الأساسية على الأسقف
    textured: 0.22      // الطبقة الأساسية على الأسطح المحببة
  },
  topcoat: {
    walls: 0.10,        // الطبقة النهائية
    ceilings: 0.15,     // الطبقة النهائية على الأسقف
    textured: 0.18      // الطبقة النهائية على الأسطح المحببة
  },
  finishing: {
    walls: 0.05,        // اللمسة الأخيرة والتفتيش
    ceilings: 0.08,     // اللمسة الأخيرة على الأسقف
    textured: 0.10      // اللمسة الأخيرة على الأسطح المحببة
  },
  custom: {
    walls: 0.10,        // مرحلة مخصصة - القيمة الافتراضية
    ceilings: 0.15,     // مرحلة مخصصة على الأسقف
    textured: 0.18      // مرحلة مخصصة على الأسطح المحببة
  }
};

interface PaintingStage {
  name: string;
  enabled: boolean;
  coats: number;
  description: string;
  customProductivityHour?: number; // Custom productivity rate (sqm per hour)
  customProductivityDay?: number; // Custom productivity rate (sqm per day)
}

interface LaborData {
  dailyWage: number;
  workingHours: number;
  laborBurden: number;
  productivityMode: 'scientific' | 'hourly' | 'daily'; // Choose calculation method
}

interface MaterialData {
  includeMaterials: boolean;
  pricePerSqm: number;
  wastePercentage: number;
  // Material calculator fields
  useGallonCalculator: boolean;
  gallonPrice: number;
  coveragePerGallon: number; // sqm per gallon
  paintBrand: string;
}

interface ProjectData {
  surfaceType: string; // Most important - affects timing significantly
  workEnvironment: string; // Indoor vs outdoor - major time difference
  area: number;
  stages: PaintingStage[];
}

interface BusinessData {
  overhead: number;
  profitMargin: number;
}

interface StageResult {
  stage: string;
  hours: number;
  cost: number;
  description: string;
}

interface CostResult {
  stageBreakdown: StageResult[];
  totalHours: number;
  laborCostPerSqm: number;
  materialCostPerSqm: number;
  totalCostPerSqm: number;
  suggestedPricePerSqm: number;
  totalProjectCost: number;
  dailyProductivity: number;
  daysRequired: number;
  breakdown: {
    basicLabor: number;
    laborBurden: number;
    materials: number;
    overhead: number;
    profit: number;
  };
}

const PaintingCostCalculator: React.FC = () => {
  const [laborData, setLaborData] = useState<LaborData>({
    dailyWage: 0,
    workingHours: 0,
    laborBurden: 0,
    productivityMode: 'scientific'
  });

  const [materialData, setMaterialData] = useState<MaterialData>({
    includeMaterials: true,
    pricePerSqm: 0,
    wastePercentage: 0,
    useGallonCalculator: false,
    gallonPrice: 0,
    coveragePerGallon: 0,
    paintBrand: 'jotun'
  });

  const [projectData, setProjectData] = useState<ProjectData>({
    surfaceType: 'walls',
    workEnvironment: 'interior',
    area: 0,
    stages: [
      { 
        name: 'primer', 
        enabled: true, 
        coats: 1, 
        description: 'البرايمر (طبقة الأساس)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      },
      { 
        name: 'skimcoat1', 
        enabled: true, 
        coats: 1, 
        description: 'سكينة رقم 1 (التسوية الأولى)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      },
      { 
        name: 'skimcoat2', 
        enabled: true, 
        coats: 1, 
        description: 'سكينة رقم 2 (التسوية الثانية)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      },
      { 
        name: 'sanding', 
        enabled: true, 
        coats: 1, 
        description: 'الصنفرة (إعداد السطح)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      },
      { 
        name: 'topcoat', 
        enabled: true, 
        coats: 1, 
        description: 'الوجه (الطبقة الرئيسية)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      },
      { 
        name: 'finishing', 
        enabled: true, 
        coats: 1, 
        description: 'التفنيش (اللمسة الأخيرة)', 
        customProductivityHour: 0,
        customProductivityDay: 0
      }
    ]
  });

  const [businessData, setBusinessData] = useState<BusinessData>({
    overhead: 0,
    profitMargin: 0
  });

  const [result, setResult] = useState<CostResult | null>(null);
  const [activeTab, setActiveTab] = useState('stages');

  // Environment factors (based on UAE conditions)
  const environmentFactors = {
    interior: 1.0,          // Standard indoor conditions
    exterior: 1.35,         // 35% more time due to UAE heat, sun exposure, wind
    exterior_height: 1.6    // High exterior work (50% more for safety, equipment)
  };

  // Surface type factors (scientific data)
  const surfaceFactors = {
    walls: 1.0,             // Base rate
    ceilings: 1.25,         // 25% more time (overhead work)
    timber: 1.20,           // Wood surfaces need more prep
    metal: 1.30,            // Metal surfaces require more care
    textured: 1.45          // Textured surfaces significantly slower
  };

  // Paint coverage data (sqm per gallon for different brands)
  const paintCoverage = {
    jotun: {
      primer: 12, // sqm per gallon
      topcoat: 16,
      gloss: 14
    },
    dulux: {
      primer: 11,
      topcoat: 15,
      gloss: 13
    },
    nippon: {
      primer: 13,
      topcoat: 17,
      gloss: 15
    },
    asian: {
      primer: 10,
      topcoat: 14,
      gloss: 12
    },
    berger: {
      primer: 11,
      topcoat: 15,
      gloss: 13
    }
  };

  const updateStage = (index: number, field: keyof PaintingStage, value: any) => {
    const newStages = [...projectData.stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setProjectData({ ...projectData, stages: newStages });
  };

  const addNewStage = () => {
    const newStage: PaintingStage = {
      name: 'custom',
      enabled: true,
      coats: 1,
      description: 'مرحلة جديدة',
      customProductivityHour: 0,
      customProductivityDay: 0
    };
    setProjectData({ 
      ...projectData, 
      stages: [...projectData.stages, newStage] 
    });
  };

  const removeStage = (index: number) => {
    const newStages = projectData.stages.filter((_, i) => i !== index);
    setProjectData({ ...projectData, stages: newStages });
  };

  // Drag and drop functionality for reordering stages
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedStageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedStageIndex === null || draggedStageIndex === dropIndex) {
      setDraggedStageIndex(null);
      return;
    }

    const newStages = [...projectData.stages];
    const draggedStage = newStages[draggedStageIndex];
    
    // Remove the dragged stage from its original position
    newStages.splice(draggedStageIndex, 1);
    
    // Insert the dragged stage at the drop position
    newStages.splice(dropIndex, 0, draggedStage);
    
    setProjectData({ ...projectData, stages: newStages });
    setDraggedStageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedStageIndex(null);
  };

  // Calculate price per sqm from gallon price
  const calculatePricePerSqm = () => {
    if (materialData.useGallonCalculator && materialData.gallonPrice && materialData.coveragePerGallon) {
      const pricePerSqm = materialData.gallonPrice / materialData.coveragePerGallon;
      setMaterialData({ ...materialData, pricePerSqm });
    }
  };

  useEffect(() => {
    if (materialData.useGallonCalculator) {
      calculatePricePerSqm();
    }
  }, [materialData.gallonPrice, materialData.coveragePerGallon, materialData.useGallonCalculator]);

  const calculateCost = () => {
    // Calculate hourly rate
    const hourlyRate = laborData.dailyWage / laborData.workingHours;

    // Calculate total hours and cost for each stage
    const stageBreakdown: StageResult[] = [];
    let totalHours = 0;

    projectData.stages.forEach(stage => {
      if (!stage.enabled) return;

      let stageHours = 0;
      
      if (laborData.productivityMode === 'hourly' && stage.customProductivityHour) {
        // Use custom hourly productivity (sqm per hour)
        const hoursPerSqm = 1 / stage.customProductivityHour;
        stageHours = hoursPerSqm * stage.coats;
      } else if (laborData.productivityMode === 'daily' && stage.customProductivityDay) {
        // Use custom daily productivity (sqm per day)
        const hoursPerSqm = laborData.workingHours / stage.customProductivityDay;
        stageHours = hoursPerSqm * stage.coats;
        } else {
          // Use scientific standards
          const rates = PRODUCTION_RATES[stage.name as keyof typeof PRODUCTION_RATES];
          const baseRate = rates[projectData.surfaceType as keyof typeof rates] || rates.walls;

          if (stage.name === 'topcoat' && stage.coats > 1) {
            // First coat uses topcoat rate, additional coats use slightly less time (repainting)
            stageHours += baseRate; // First coat
            stageHours += (stage.coats - 1) * (baseRate * 0.8); // Additional coats are 20% faster
          } else {
            stageHours += baseRate * stage.coats;
          }

          // Apply surface type factor
          const surfaceFactor = surfaceFactors[projectData.surfaceType as keyof typeof surfaceFactors] || 1.0;
          stageHours *= surfaceFactor;

          // Apply environment factor (major difference in UAE)
          const environmentFactor = environmentFactors[projectData.workEnvironment as keyof typeof environmentFactors] || 1.0;
          stageHours *= environmentFactor;
        }

      const stageCost = stageHours * hourlyRate;
      totalHours += stageHours;

      let productivityInfo = '';
      if (laborData.productivityMode === 'hourly' && stage.customProductivityHour) {
        productivityInfo = `${stage.customProductivityHour} م²/ساعة - ${(1/stage.customProductivityHour).toFixed(3)} ساعة/م²`;
      } else if (laborData.productivityMode === 'daily' && stage.customProductivityDay) {
        const dailyHours = laborData.workingHours / stage.customProductivityDay;
        productivityInfo = `${stage.customProductivityDay} م²/يوم - ${dailyHours.toFixed(3)} ساعة/م²`;
      } else {
        productivityInfo = `معايير علمية - ${stageHours.toFixed(3)} ساعة/م²`;
      }

      stageBreakdown.push({
        stage: `${stage.description}`,
        hours: stageHours,
        cost: stageCost,
        description: `${stage.coats} ${stage.coats === 1 ? 'وجه' : 'وجوه'} - ${productivityInfo}`
      });
    });

    // Calculate labor costs
    const basicLaborCost = totalHours * hourlyRate;
    const laborBurdenCost = basicLaborCost * (laborData.laborBurden / 100);
    const totalLaborCostPerSqm = basicLaborCost + laborBurdenCost;

    // Calculate material costs
    let materialCostPerSqm = 0;
    if (materialData.includeMaterials) {
      const wasteFactor = 1 + (materialData.wastePercentage / 100);
      // Calculate total coats for materials - use actual coats, not normalized
      const totalCoats = projectData.stages
        .filter(stage => stage.enabled)
        .reduce((sum, stage) => sum + stage.coats, 0);
      // Material cost should be proportional to actual number of coats
      materialCostPerSqm = materialData.pricePerSqm * wasteFactor * (totalCoats / 5); // Assuming 5 is standard total coats
    }

    // Calculate total cost
    const totalCostPerSqm = totalLaborCostPerSqm + materialCostPerSqm;

    // Add overhead and profit
    const overheadCost = totalCostPerSqm * (businessData.overhead / 100);
    const costWithOverhead = totalCostPerSqm + overheadCost;
    const profitAmount = costWithOverhead * (businessData.profitMargin / 100);
    const suggestedPricePerSqm = costWithOverhead + profitAmount;

    // Calculate productivity metrics
    const dailyProductivity = laborData.workingHours / totalHours; // sqm per day
    const daysRequired = projectData.area / dailyProductivity;
    const totalProjectCost = suggestedPricePerSqm * projectData.area;

    setResult({
      stageBreakdown,
      totalHours,
      laborCostPerSqm: totalLaborCostPerSqm,
      materialCostPerSqm,
      totalCostPerSqm,
      suggestedPricePerSqm,
      totalProjectCost,
      dailyProductivity,
      daysRequired,
      breakdown: {
        basicLabor: basicLaborCost,
        laborBurden: laborBurdenCost,
        materials: materialCostPerSqm,
        overhead: overheadCost,
        profit: profitAmount
      }
    });
  };

  useEffect(() => {
    calculateCost();
  }, [laborData, materialData, projectData, businessData]);

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              حاسبة التكلفة العلمية للدهانات
            </h1>
            <div className="text-lg font-semibold text-primary mb-3">
              المشهد سكاي للخدمات للمقاولات
            </div>
            <p className="text-muted-foreground text-lg">
              حساب دقيق للتكلفة بناءً على المعايير العلمية لكل مرحلة من مراحل الدهان
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* الإدخالات */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger 
                  value="stages" 
                  className={`${activeTab === 'stages' ? 'bg-blue-500 text-white' : ''}`}
                >
                  1. المراحل
                </TabsTrigger>
                <TabsTrigger 
                  value="labor"
                  className={`${activeTab === 'labor' ? 'bg-blue-500 text-white' : ''}`}
                >
                  2. العمالة
                </TabsTrigger>
                <TabsTrigger 
                  value="materials"
                  className={`${activeTab === 'materials' ? 'bg-blue-500 text-white' : ''}`}
                >
                  3. المواد
                </TabsTrigger>
                <TabsTrigger 
                  value="project"
                  className={`${activeTab === 'project' ? 'bg-blue-500 text-white' : ''}`}
                >
                  4. المشروع
                </TabsTrigger>
                <TabsTrigger 
                  value="business"
                  className={`${activeTab === 'business' ? 'bg-blue-500 text-white' : ''}`}
                >
                  5. الأعمال
                </TabsTrigger>
                <TabsTrigger value="engineering">الوضع الهندسي</TabsTrigger>
</TabsList>

              {/* تبويب مراحل الدهان */}
              <TabsContent value="stages">
                <Card>
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      مراحل الدهان وانتاجية العمال
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">طريقة حساب الإنتاجية:</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            laborData.productivityMode === 'scientific' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted-foreground/20 hover:border-primary/50'
                          }`}
                          onClick={() => setLaborData({...laborData, productivityMode: 'scientific'})}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full border ${
                              laborData.productivityMode === 'scientific' ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">المعايير العلمية</span>
                          </div>
                          <p className="text-xs text-muted-foreground">معايير البناء الدولية</p>
                        </div>

                        <div 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            laborData.productivityMode === 'hourly' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted-foreground/20 hover:border-primary/50'
                          }`}
                          onClick={() => setLaborData({...laborData, productivityMode: 'hourly'})}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full border ${
                              laborData.productivityMode === 'hourly' ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">بالساعة</span>
                          </div>
                          <p className="text-xs text-muted-foreground">كم م² في الساعة</p>
                        </div>

                        <div 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            laborData.productivityMode === 'daily' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted-foreground/20 hover:border-primary/50'
                          }`}
                          onClick={() => setLaborData({...laborData, productivityMode: 'daily'})}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full border ${
                              laborData.productivityMode === 'daily' ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">باليوم</span>
                          </div>
                          <p className="text-xs text-muted-foreground">كم م² في اليوم</p>
                        </div>
                      </div>
                    </div>

                    {laborData.productivityMode === 'scientific' && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">معدلات الإنتاجية العلمية</span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          تم حساب معدلات الإنتاجية بناءً على المعايير الدولية للبناء (RSMeans، RICS)
                        </p>
                      </div>
                    )}

                    {laborData.productivityMode === 'hourly' && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">حساب بالساعة</span>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          أدخل كم متر مربع ينجز العامل في الساعة الواحدة لكل مرحلة
                        </p>
                      </div>
                    )}

                    {laborData.productivityMode === 'daily' && (
                      <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">حساب باليوم</span>
                        </div>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          أدخل كم متر مربع ينجز العامل في اليوم الكامل ({laborData.workingHours} ساعات) - يراعي اختلاف الأداء اليومي
                        </p>
                      </div>
                    )}
                    
                    {projectData.stages.map((stage, index) => (
                      <Card 
                        key={`${stage.name}-${index}`} 
                        className={`p-4 border transition-all duration-200 ${
                          draggedStageIndex === index 
                            ? 'opacity-50 scale-95 rotate-2' 
                            : 'hover:shadow-md'
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Switch
                              checked={stage.enabled}
                              onCheckedChange={(checked) => updateStage(index, 'enabled', checked)}
                            />
                            <div className="flex-1">
                              {stage.name === 'custom' ? (
                                <Input
                                  value={stage.description}
                                  onChange={(e) => updateStage(index, 'description', e.target.value)}
                                  className="font-medium text-base h-8 bg-transparent border-none p-0"
                                  placeholder="اسم المرحلة"
                                />
                              ) : (
                                <Label className="font-medium text-base">{stage.description}</Label>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {laborData.productivityMode === 'hourly' && stage.customProductivityHour
                                    ? `${stage.customProductivityHour} م²/ساعة`
                                    : laborData.productivityMode === 'daily' && stage.customProductivityDay
                                    ? `${stage.customProductivityDay} م²/يوم`
                                    : `${PRODUCTION_RATES[stage.name as keyof typeof PRODUCTION_RATES][projectData.surfaceType as keyof typeof PRODUCTION_RATES.primer].toFixed(3)} ساعة/م² (علمي)`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {laborData.productivityMode === 'scientific' ? 'معايير البناء' 
                               : laborData.productivityMode === 'hourly' ? 'إنتاجية/ساعة'
                               : 'إنتاجية/يوم'}
                            </Badge>
                            {stage.name === 'custom' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeStage(index)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {stage.enabled && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">عدد الوجوه</Label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={stage.coats}
                                onChange={(e) => updateStage(index, 'coats', parseInt(e.target.value) || 1)}
                                className="h-8"
                              />
                            </div>
                            
                            {laborData.productivityMode === 'hourly' ? (
                              <div>
                                <Label className="text-sm">الإنتاجية (م²/ساعة)</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="50"
                                  value={stage.customProductivityHour || 0}
                                  onChange={(e) => updateStage(index, 'customProductivityHour', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                  placeholder="أدخل الإنتاجية"
                                />
                              </div>
                            ) : laborData.productivityMode === 'daily' ? (
                              <div>
                                <Label className="text-sm">الإنتاجية (م²/يوم)</Label>
                                <Input
                                  type="number"
                                  step="5"
                                  min="0"
                                  max="200"
                                  value={stage.customProductivityDay || 0}
                                  onChange={(e) => updateStage(index, 'customProductivityDay', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                  placeholder="أدخل الإنتاجية"
                                />
                              </div>
                            ) : (
                              <div className="flex items-end">
                                <div className="text-xs text-muted-foreground">
                                  <div>إجمالي الوقت:</div>
                                  <div className="font-medium">
                                    {(PRODUCTION_RATES[stage.name as keyof typeof PRODUCTION_RATES][projectData.surfaceType as keyof typeof PRODUCTION_RATES.primer] * stage.coats).toFixed(3)} ساعة/م²
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                    
                    {/* زر إضافة مرحلة جديدة */}
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={addNewStage}
                        variant="outline"
                        className="w-full max-w-xs"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        إضافة مرحلة جديدة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب العمالة */}
              <TabsContent value="labor">
                <Card>
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      بيانات العمالة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="dailyWage">راتب العامل اليومي (درهم)</Label>
                      <Input
                        id="dailyWage"
                        type="number"
                        value={laborData.dailyWage}
                        onChange={(e) => setLaborData({...laborData, dailyWage: parseFloat(e.target.value) || 0})}
                        placeholder="مثال: 200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="workingHours">ساعات العمل اليومية</Label>
                      <Input
                        id="workingHours"
                        type="number"
                        value={laborData.workingHours}
                        onChange={(e) => setLaborData({...laborData, workingHours: parseFloat(e.target.value) || 8})}
                        placeholder="مثال: 8"
                      />
                    </div>

                    <div>
                      <Label htmlFor="laborBurden">التكاليف الإضافية للعمالة (%)</Label>
                      <Input
                        id="laborBurden"
                        type="number"
                        value={laborData.laborBurden}
                        onChange={(e) => setLaborData({...laborData, laborBurden: parseFloat(e.target.value) || 0})}
                        placeholder="مثال: 20"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        تأمينات، مواصلات، أدوات، إلخ
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب المواد */}
              <TabsContent value="materials">
                <Card>
                  <CardHeader className="bg-gradient-accent text-accent-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      بيانات المواد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includeMaterials"
                        checked={materialData.includeMaterials}
                        onCheckedChange={(checked) => setMaterialData({...materialData, includeMaterials: checked})}
                      />
                      <Label htmlFor="includeMaterials">تشمل تكلفة المواد</Label>
                    </div>

                    {materialData.includeMaterials && (
                      <>
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">طريقة حساب تكلفة المواد:</Label>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div 
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                !materialData.useGallonCalculator 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-muted-foreground/20 hover:border-primary/50'
                              }`}
                              onClick={() => setMaterialData({...materialData, useGallonCalculator: false})}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-full border ${
                                  !materialData.useGallonCalculator ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`} />
                                <span className="text-sm font-medium">إدخال مباشر</span>
                              </div>
                              <p className="text-xs text-muted-foreground">أدخل سعر المتر مباشرة</p>
                            </div>

                            <div 
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                materialData.useGallonCalculator 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-muted-foreground/20 hover:border-primary/50'
                              }`}
                              onClick={() => setMaterialData({...materialData, useGallonCalculator: true})}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-full border ${
                                  materialData.useGallonCalculator ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`} />
                                <span className="text-sm font-medium">حاسبة الجالون</span>
                              </div>
                              <p className="text-xs text-muted-foreground">احسب من سعر الجالون</p>
                            </div>
                          </div>
                        </div>

                        {materialData.useGallonCalculator ? (
                          <div className="space-y-4 p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="font-medium">حاسبة تكلفة الجالون</span>
                            </div>

                            <div>
                              <Label htmlFor="paintBrand">ماركة الدهان</Label>
                              <Select value={materialData.paintBrand} onValueChange={(value) => {
                                const coverage = paintCoverage[value as keyof typeof paintCoverage]?.topcoat || 16;
                                setMaterialData({...materialData, paintBrand: value, coveragePerGallon: coverage});
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="jotun">جوتن (Jotun)</SelectItem>
                                  <SelectItem value="dulux">دولكس (Dulux)</SelectItem>
                                  <SelectItem value="nippon">نيبون (Nippon)</SelectItem>
                                  <SelectItem value="asian">آسيان بينت (Asian Paints)</SelectItem>
                                  <SelectItem value="berger">بيرجر (Berger)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="gallonPrice">سعر الجالون (درهم)</Label>
                                <Input
                                  id="gallonPrice"
                                  type="number"
                                  value={materialData.gallonPrice}
                                  onChange={(e) => setMaterialData({...materialData, gallonPrice: parseFloat(e.target.value) || 0})}
                                  placeholder="مثال: 180"
                                />
                              </div>

                              <div>
                                <Label htmlFor="coverage">التغطية (م²/جالون)</Label>
                                <Input
                                  id="coverage"
                                  type="number"
                                  value={materialData.coveragePerGallon}
                                  onChange={(e) => setMaterialData({...materialData, coveragePerGallon: parseFloat(e.target.value) || 16})}
                                  placeholder="مثال: 16"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  كم متر مربع يغطي الجالون الواحد
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-primary/10 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">التكلفة المحسوبة:</span>
                                <span className="text-lg font-bold text-primary">
                                  {materialData.gallonPrice && materialData.coveragePerGallon 
                                    ? (materialData.gallonPrice / materialData.coveragePerGallon).toFixed(2)
                                    : '0.00'
                                  } درهم/م²
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {materialData.gallonPrice} درهم ÷ {materialData.coveragePerGallon} م² = تكلفة المتر
                              </p>
                            </div>

                            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                              <div className="font-medium mb-1">📋 معدلات التغطية المعتادة:</div>
                              <div className="grid grid-cols-2 gap-1">
                                <div>• البرايمر: 10-13 م²/جالون</div>
                                <div>• الدهان العادي: 14-17 م²/جالون</div>
                                <div>• الدهان اللامع: 12-15 م²/جالون</div>
                                <div>• حسب نعومة السطح</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="pricePerSqm">سعر المواد للمتر المربع (درهم)</Label>
                            <Input
                              id="pricePerSqm"
                              type="number"
                              value={materialData.pricePerSqm}
                              onChange={(e) => setMaterialData({...materialData, pricePerSqm: parseFloat(e.target.value) || 0})}
                              placeholder="مثال: 12"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="wastePercentage">نسبة الهدر (%)</Label>
                          <Input
                            id="wastePercentage"
                            type="number"
                            value={materialData.wastePercentage}
                            onChange={(e) => setMaterialData({...materialData, wastePercentage: parseFloat(e.target.value) || 0})}
                            placeholder="مثال: 10"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            الفقد الطبيعي في المواد (عادة 10-15%)
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب المشروع */}
              <TabsContent value="project">
                <Card>
                  <CardHeader className="bg-gradient-accent text-accent-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      المساحة الإجمالية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div>
                      <Label htmlFor="area">مساحة المشروع (متر مربع)</Label>
                      <Input
                        id="area"
                        type="number"
                        value={projectData.area}
                        onChange={(e) => setProjectData({...projectData, area: parseFloat(e.target.value) || 0})}
                        placeholder="مثال: 100"
                        className="text-lg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تبويب الأعمال */}
              <TabsContent value="business">
                <Card>
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      إعدادات العمل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="overhead">النفقات الإدارية (%)</Label>
                      <Input
                        id="overhead"
                        type="number"
                        value={businessData.overhead}
                        onChange={(e) => setBusinessData({...businessData, overhead: parseFloat(e.target.value) || 0})}
                        placeholder="مثال: 15"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        الإيجار، الكهرباء، الإدارة، إلخ
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="profitMargin">هامش الربح المطلوب (%)</Label>
                      <Input
                        id="profitMargin"
                        type="number"
                        value={businessData.profitMargin}
                        onChange={(e) => setBusinessData({...businessData, profitMargin: parseFloat(e.target.value) || 0})}
                        placeholder="مثال: 25"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        الربح المطلوب على التكلفة الإجمالية
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="engineering">
    <EngineeringPanel />
  </TabsContent>
</Tabs>
          </div>

          {/* النتائج */}
          <div className="space-y-6">
            {result && (
              <>
                {/* تفصيل المراحل */}
                <Card>
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      تفصيل التكلفة حسب المراحل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {result.stageBreakdown.map((stage, index) => (
                      <div key={index} className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{stage.stage}</span>
                          <span className="font-bold text-primary">
                            {stage.cost.toFixed(2)} درهم/م²
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stage.description}
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold">إجمالي العمالة</span>
                          <div className="text-xs text-muted-foreground">
                            {result.totalHours.toFixed(3)} ساعة/م²
                          </div>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {result.laborCostPerSqm.toFixed(2)} درهم/م²
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ملخص التكلفة */}
                <Card>
                  <CardHeader className="bg-gradient-accent text-accent-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      ملخص التكلفة النهائية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* عرض مكونات التكلفة */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-800 dark:text-blue-200">تكلفة العمالة</span>
                          <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                            {result.laborCostPerSqm.toFixed(2)} درهم/م²
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          {result.totalHours.toFixed(3)} ساعة/م² • عمالة أساسية + أعباء {laborData.laborBurden}%
                        </div>
                      </div>

                      {materialData.includeMaterials && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800 dark:text-green-200">تكلفة المواد</span>
                            <span className="text-lg font-bold text-green-800 dark:text-green-200">
                              {result.materialCostPerSqm.toFixed(2)} درهم/م²
                            </span>
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-300 mt-1">
                            شامل نسبة هدر {materialData.wastePercentage}% • {projectData.stages.filter(s => s.enabled).reduce((sum, stage) => sum + stage.coats, 0)} وجه إجمالي
                          </div>
                        </div>
                      )}

                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-orange-800 dark:text-orange-200">المصاريف والربح</span>
                          <span className="text-lg font-bold text-orange-800 dark:text-orange-200">
                            {(result.breakdown.overhead + result.breakdown.profit).toFixed(2)} درهم/م²
                          </span>
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                          مصاريف عامة {businessData.overhead}% + ربح {businessData.profitMargin}%
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {result.suggestedPricePerSqm.toFixed(2)} درهم/م²
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">
                          {materialData.includeMaterials ? 'السعر الشامل (عمالة + مواد)' : 'سعر العمالة فقط'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg text-center">
                      <div className="text-xl font-bold">
                        {result.totalProjectCost.toFixed(0)} درهم
                      </div>
                      <div className="text-sm text-muted-foreground">
                        إجمالي المشروع ({projectData.area} م²)
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {materialData.includeMaterials ? 'شامل العمالة والمواد والمصاريف والربح' : 'العمالة والمصاريف والربح فقط'}
                      </div>
                    </div>

                    {!materialData.includeMaterials && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 text-center">
                          ⚠️ تكلفة المواد غير مشمولة - يجب إضافتها منفصلة
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* معلومات الإنتاجية */}
                <Card>
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      معلومات الإنتاجية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-sm font-medium">الإنتاجية اليومية</div>
                      <div className="text-lg font-bold text-primary">
                        {result.dailyProductivity.toFixed(1)} م²/يوم
                      </div>
                      <div className="text-xs text-muted-foreground">
                        بناءً على {result.totalHours.toFixed(2)} ساعة لكل متر مربع
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-sm font-medium">مدة تنفيذ المشروع</div>
                      <div className="text-lg font-bold text-primary">
                        {result.daysRequired.toFixed(1)} يوم
                      </div>
                      <div className="text-xs text-muted-foreground">
                        لإنجاز {projectData.area} متر مربع
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* مقارنة السوق */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">مقارنة مع أسعار السوق</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2 text-xs">
                      <div className="bg-muted p-2 rounded flex justify-between">
                        <span>دهان داخلي عادي</span>
                        <span>8-12 درهم/م²</span>
                      </div>
                      <div className="bg-muted p-2 rounded flex justify-between">
                        <span>دهان خارجي</span>
                        <span>10-15 درهم/م²</span>
                      </div>
                      <div className="bg-muted p-2 rounded flex justify-between">
                        <span>أسقف جبسية</span>
                        <span>12-18 درهم/م²</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaintingCostCalculator;