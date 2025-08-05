import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Filter, SortAsc, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface FilterState {
  categories: string[];
  distance: string | null;
  timeOfDay: string[];
  sortBy: string;
}

interface ServiceFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function ServiceFilters({ filters, onFiltersChange, onClearFilters }: ServiceFiltersProps) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("id, name")
      .order("name");
    
    if (data) {
      setCategories(data);
    }
  };

  const updateFilter = (key: keyof FilterState, value: string | null) => {
    const newValue = value === "all" ? null : value;
    onFiltersChange({ ...filters, [key]: newValue });
  };

  const updateCategoriesFilter = (categoryName: string, checked: boolean) => {
    const newCategories = checked 
      ? [...filters.categories, categoryName]
      : filters.categories.filter(cat => cat !== categoryName);
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const updateTimeOfDayFilter = (timeOfDay: string, checked: boolean) => {
    const newTimeOfDay = checked 
      ? [...filters.timeOfDay, timeOfDay]
      : filters.timeOfDay.filter(time => time !== timeOfDay);
    onFiltersChange({ ...filters, timeOfDay: newTimeOfDay });
  };

  const hasActiveFilters = filters.categories.length > 0 || filters.distance || filters.timeOfDay.length > 0;

  const timeOfDayOptions = [
    { value: "morning", label: "Morning (6 AM - 12 PM)" },
    { value: "afternoon", label: "Afternoon (12 PM - 6 PM)" },
    { value: "evening", label: "Evening (6 PM - 10 PM)" }
  ];

  const distanceOptions = [
    { value: "1", label: "Within 1 mile" },
    { value: "5", label: "Within 5 miles" },
    { value: "10", label: "Within 10 miles" }
  ];

  const sortOptions = [
    { value: "closest", label: "Closest First" },
    { value: "popular", label: "Most Popular" },
    { value: "soonest", label: "Soonest Available" },
    { value: "most_discounted", label: "Most Discounted" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Filters & Sort</h3>
            </div>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter - Multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Categories</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.categories.length === 0 
                      ? "All Categories" 
                      : `${filters.categories.length} selected`}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={filters.categories.includes(category.name)}
                          onCheckedChange={(checked) => 
                            updateCategoriesFilter(category.name, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={category.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Distance Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Distance</label>
              <Select 
                value={filters.distance || "all"} 
                onValueChange={(value) => updateFilter("distance", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Distance</SelectItem>
                  {distanceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time of Day Filter - Multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Time of Day</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {filters.timeOfDay.length === 0 
                      ? "Any Time" 
                      : `${filters.timeOfDay.length} selected`}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    {timeOfDayOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={filters.timeOfDay.includes(option.value)}
                          onCheckedChange={(checked) => 
                            updateTimeOfDayFilter(option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={option.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                <SortAsc className="h-4 w-4 inline mr-1" />
                Sort By
              </label>
              <Select 
                value={filters.sortBy} 
                onValueChange={(value) => updateFilter("sortBy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.categories.map((category) => (
                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                  {category}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateCategoriesFilter(category, false)}
                  />
                </Badge>
              ))}
              {filters.distance && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Within {filters.distance} miles
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter("distance", null)}
                  />
                </Badge>
              )}
              {filters.timeOfDay.map((time) => (
                <Badge key={time} variant="secondary" className="flex items-center gap-1">
                  {timeOfDayOptions.find(opt => opt.value === time)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateTimeOfDayFilter(time, false)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}