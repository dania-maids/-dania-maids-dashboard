'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimePeriodsSettings } from "@/components/settings/time-periods-settings"
import { PricingRulesSettings } from "@/components/settings/pricing-rules-settings"
import { SpecialAreasPricingSettings } from "@/components/settings/special-areas-price"
import { SpecialAreasSettings } from "@/components/settings/special-areas-settings"
import { ChannelRulesSettings } from "@/components/settings/channel-rules-settings"
import { GapRulesSettings } from "@/components/settings/gap-rules-settings"
import { ReminderTypesSettings } from "@/components/settings/reminder-types-settings"
import { GeneralSettings } from "@/components/settings/general-settings"
import { Clock, DollarSign, MapPin, Radio, Bell, Settings as SettingsIcon, Gauge, Navigation } from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("time-periods")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage system configuration and business rules</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="space-y-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="time-periods" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Periods
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="areas" className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Special Areas
            </TabsTrigger>
            <TabsTrigger value="area-pricing" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Area Pricing
            </TabsTrigger>
          </TabsList>

          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Channel Rules
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Gap Rules
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="time-periods">
          <Card>
            <CardHeader>
              <CardTitle>Time Periods Configuration</CardTitle>
              <CardDescription>Define working hours for different periods of the day</CardDescription>
            </CardHeader>
            <CardContent>
              <TimePeriodsSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>Configure hourly rates based on duration and booking channel</CardDescription>
            </CardHeader>
            <CardContent>
              <PricingRulesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas">
          <Card>
            <CardHeader>
              <CardTitle>Special Areas</CardTitle>
              <CardDescription>Manage special areas (locations with unique rules)</CardDescription>
            </CardHeader>
            <CardContent>
              <SpecialAreasSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="area-pricing">
          <Card>
            <CardHeader>
              <CardTitle>Special Area Pricing</CardTitle>
              <CardDescription>Configure custom pricing for specific areas (e.g., Lusail)</CardDescription>
            </CardHeader>
            <CardContent>
              <SpecialAreasPricingSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Channel Rules</CardTitle>
              <CardDescription>Configure business rules for different booking channels</CardDescription>
            </CardHeader>
            <CardContent>
              <ChannelRulesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Gap Rules</CardTitle>
              <CardDescription>Configure gap time between bookings for travel</CardDescription>
            </CardHeader>
            <CardContent>
              <GapRulesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Rules</CardTitle>
              <CardDescription>Configure automatic reminder messages</CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderTypesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>System-wide configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}