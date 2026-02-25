"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "./schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";

type Country = { id: string; name: string };
type StateType = { id: string; name: string };
type City = { id: string; name: string };

let countriesCache: Country[] | null = null;
const statesCache = new Map<string, StateType[]>();
const citiesCache = new Map<string, City[]>();

async function loadCountries(): Promise<Country[]> {
  if (countriesCache) return countriesCache;

  const res = await fetch("/api/geo/countries");
  if (!res.ok) {
    throw new Error("Failed to load countries");
  }

  const data = (await res.json()) as Country[];
  countriesCache = data;
  return data;
}

async function loadStates(countryId: string): Promise<StateType[]> {
  if (statesCache.has(countryId)) {
    return statesCache.get(countryId)!;
  }

  const res = await fetch(`/api/geo/states?countryId=${countryId}`);
  if (!res.ok) {
    throw new Error("Failed to load states");
  }

  const data = (await res.json()) as StateType[];
  statesCache.set(countryId, data);
  return data;
}

async function loadCities(stateId: string): Promise<City[]> {
  if (citiesCache.has(stateId)) {
    return citiesCache.get(stateId)!;
  }

  const res = await fetch(`/api/geo/cities?stateId=${stateId}`);
  if (!res.ok) {
    throw new Error("Failed to load cities");
  }

  const data = (await res.json()) as City[];
  citiesCache.set(stateId, data);
  return data;
}

export default function SignupPage() {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      countryId: "",
      stateId: "",
      cityId: "",
    },
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadCountries()
      .then((data) => {
        if (!isMounted) return;
        setCountries(data);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const countryId = form.watch("countryId");
  const stateId = form.watch("stateId");

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      form.setValue("stateId", "");
      return;
    }

    let isMounted = true;

    loadStates(countryId)
      .then((data) => {
        if (!isMounted) return;
        setStates(data);
        setCities([]);
        form.setValue("stateId", "");
        form.setValue("cityId", "");
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, [countryId, form]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      form.setValue("cityId", "");
      return;
    }

    let isMounted = true;

    loadCities(stateId)
      .then((data) => {
        if (!isMounted) return;
        setCities(data);
        form.setValue("cityId", "");
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, [stateId, form]);

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    const { confirmPassword, ...payload } = values;

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      const field = data.field as keyof SignupInput | undefined;
      if (field) {
        form.setError(field, { message: data.error });
      } else {
        alert(data.error || "Signup failed");
      }
      return;
    }
    alert("Registered. Check your email to verify.");
    form.reset();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Sign up to access your CRM dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={!countryId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={!stateId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
