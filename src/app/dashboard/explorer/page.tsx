"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ExplorerPage() {
  const [platform, setPlatform] = useState("chatgpt");
  const [countryCode, setCountryCode] = useState("US");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, countryCode, prompt }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch result");
      }
      
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Prompt Explorer (POC)</h1>
        <p className="text-muted-foreground">
          Test AI monitoring queries and check real-time structured parsing results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">AI Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v || "chatgpt")}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chatgpt">ChatGPT (OpenAI)</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="gemini">Gemini (Google)</SelectItem>
                  <SelectItem value="gaio">Google AI Overviews (SerpApi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Target Country (Geo-Simulation)</Label>
              <Select value={countryCode} onValueChange={(v) => setCountryCode(v || "US")}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States (US)</SelectItem>
                  <SelectItem value="CN">China (CN)</SelectItem>
                  <SelectItem value="UK">United Kingdom (UK)</SelectItem>
                  <SelectItem value="DE">Germany (DE)</SelectItem>
                  <SelectItem value="JP">Japan (JP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Monitoring Question</Label>
            <Textarea 
              id="prompt"
              placeholder="e.g. What are the best luxury hotels in London?" 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <Button 
            onClick={handleRun} 
            disabled={loading || !prompt.trim()}
            className="w-full md:w-auto"
          >
            {loading ? "Querying & Parsing..." : "Execute Test"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Raw AI Response</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="bg-muted p-4 rounded-md h-[400px] overflow-auto whitespace-pre-wrap text-sm border">
                {result.raw || "No raw response received."}
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Structured Parsing Result (JSON)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="bg-muted p-4 rounded-md h-[400px] overflow-auto border font-mono text-xs">
                <pre>{JSON.stringify(result.structured, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
