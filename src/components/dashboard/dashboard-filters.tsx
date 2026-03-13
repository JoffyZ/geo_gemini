'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Loader2 } from 'lucide-react';

interface DashboardFiltersProps {
  categories: { id: string; name: string }[];
  countries: string[];
  platforms: string[];
}

export function DashboardFilters({ categories, countries, platforms }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (params: Record<string, string | string[] | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          newParams.delete(key);
        } else if (Array.isArray(value)) {
          newParams.delete(key);
          value.forEach(v => newParams.append(key, v));
        } else {
          newParams.set(key, value);
        }
      });

      return newParams.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string | string[]) => {
    const queryString = createQueryString({ [key]: value });
    startTransition(() => {
      router.push(`/dashboard?${queryString}`);
    });
  };

  const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
  const selectedCategory = searchParams.get('category') || 'all';
  const selectedPlatform = searchParams.get('platform') || 'all';
  const selectedCountry = searchParams.get('country') || 'all';

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-card border rounded-lg shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="start-date" className="text-xs font-medium">Start Date</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => handleFilterChange('start', e.target.value)}
          className="w-40 h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date" className="text-xs font-medium">End Date</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => handleFilterChange('end', e.target.value)}
          className="w-40 h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Category</Label>
        <Select value={selectedCategory} onValueChange={(v) => handleFilterChange('category', v)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Platform</Label>
        <Select value={selectedPlatform} onValueChange={(v) => handleFilterChange('platform', v)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Country</Label>
        <Select value={selectedCountry} onValueChange={(v) => handleFilterChange('country', v)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 mb-0.5">
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push('/dashboard')}
          className="h-9"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
