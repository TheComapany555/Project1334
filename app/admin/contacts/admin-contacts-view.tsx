"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Building2, Search, Users, MessageSquare } from "lucide-react";
import type { AdminUser, AdminEnquiryContact } from "@/lib/actions/admin-contacts";

type Props = {
  users: AdminUser[];
  enquiryContacts: AdminEnquiryContact[];
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminContactsView({ users, enquiryContacts }: Props) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();

  const filteredUsers = q
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q) ||
          u.company?.toLowerCase().includes(q)
      )
    : users;

  const filteredContacts = q
    ? enquiryContacts.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q)
      )
    : enquiryContacts;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Registered Users ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="enquiry" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Enquiry Contacts ({filteredContacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-6">
              <CardTitle className="text-sm">Registered Users</CardTitle>
              <CardDescription className="text-xs">
                All users who have signed up on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No users found.</p>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </span>
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.phone}
                            </span>
                          )}
                          {u.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {u.company}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {u.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(u.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enquiry">
          <Card>
            <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-6">
              <CardTitle className="text-sm">Enquiry Contacts</CardTitle>
              <CardDescription className="text-xs">
                Unique email addresses from all enquiries submitted on listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No enquiry contacts found.</p>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {filteredContacts.map((c) => (
                    <div key={c.email} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                        {(c.name ?? c.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                          {c.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {c.enquiry_count} enquir{c.enquiry_count === 1 ? "y" : "ies"}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Last: {formatDate(c.last_enquiry_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
