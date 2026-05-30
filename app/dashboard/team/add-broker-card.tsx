"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail } from "lucide-react";
import { AddBrokerForm } from "./add-broker-form";
import { InviteForm } from "./invite-form";

type Mode = "direct" | "invite";

export function AddBrokerCard() {
  const [mode, setMode] = useState<Mode>("direct");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a broker</CardTitle>
        <CardDescription>
          {mode === "direct"
            ? "Create the broker account now and email them a link to set their password. Fastest for onboarding multiple brokers."
            : "Send an invitation email. The broker creates their own account by clicking the link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="direct">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add directly
            </TabsTrigger>
            <TabsTrigger value="invite">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct">
            <AddBrokerForm />
          </TabsContent>
          <TabsContent value="invite">
            <InviteForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
