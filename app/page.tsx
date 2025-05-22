"use client"

import { useState, useEffect } from "react"
import {
  PlusCircle,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Clock,
  AlertCircle,
  Tag,
  X,
  Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Slider } from "@/components/ui/slider"
import { format, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"

// Define the Category type
interface Category {
  id: string
  name: string
  color: string
}

// Define the Task type with subtasks, deadline, optional category, and priority
interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: Date
  deadline?: Date | null
  subtasks: Task[]
  expanded: boolean
  categoryId?: string // Make categoryId optional for subtasks
  priority: number // Priority from 0 to 10, default 0
}

// Generate a color from a string (category name)
function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Generate HSL color with fixed saturation and lightness for better visibility
  // Use hue based on hash for variety
  const hue = Math.abs(hash % 360)

  // Return HSL color with good saturation and lightness for dark theme
  return `hsl(${hue}, 70%, 60%)`
}

// Get priority color based on priority value
function getPriorityColor(priority: number): string {
  if (priority === 0) return "#6b7280" // Gray for no priority
  if (priority >= 8) return "#ef4444" // Red for high priority
  if (priority >= 5) return "#f59e0b" // Amber for medium priority
  return "#10b981" // Green for low priority
}

// Get priority label based on priority value
function getPriorityLabel(priority: number): string {
  if (priority === 0) return "None"
  if (priority >= 8) return "High"
  if (priority >= 5) return "Medium"
  return "Low"
}

export default function TodoApp() {
  // State for tasks and categories
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([{ id: "default", name: "General", color: "#6366f1" }])
  const [newTask, setNewTask] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState("default")
  const [activeFilter, setActiveFilter] = useState("all")
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([])
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState("")
  const [newCategoryInput, setNewCategoryInput] = useState("")
  const [commandOpen, setCommandOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskText, setEditTaskText] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState(0)
  const [editingPriorityTaskId, setEditingPriorityTaskId] = useState<string | null>(null)
  const [tempPriority, setTempPriority] = useState<number>(0)

  // Load tasks and categories from localStorage on initial render
  useEffect(() => {
    const storedTasks = localStorage.getItem("tasks")
    const storedCategories = localStorage.getItem("categories")

    if (storedCategories) {
      try {
        const parsedCategories = JSON.parse(storedCategories)
        setCategories(parsedCategories)
      } catch (error) {
        console.error("Error parsing categories from localStorage:", error)
      }
    }

    if (storedTasks) {
      try {
        // Parse the stored JSON and convert string dates back to Date objects
        const parsedTasks = JSON.parse(storedTasks, (key, value) => {
          // Convert date strings back to Date objects
          if (key === "createdAt" || key === "deadline") {
            return value ? new Date(value) : null
          }
          return value
        })

        // Add priority field with default value 0 if it doesn't exist
        const tasksWithPriority = addPriorityToTasks(parsedTasks)
        setTasks(tasksWithPriority)
      } catch (error) {
        console.error("Error parsing tasks from localStorage:", error)
      }
    }
  }, [])

  // Helper function to recursively add priority field to tasks
  const addPriorityToTasks = (taskList: any[]): Task[] => {
    return taskList.map((task) => ({
      ...task,
      priority: task.priority !== undefined ? task.priority : 0,
      subtasks: task.subtasks ? addPriorityToTasks(task.subtasks) : [],
    }))
  }

  // Save tasks and categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories))
  }, [categories])

  // Create or find a category
  const getOrCreateCategory = (categoryName: string): string => {
    // Trim and normalize the category name
    const trimmedName = categoryName.trim()
    if (!trimmedName) return "default"

    // Check if category already exists (case insensitive)
    const existingCategory = categories.find((cat) => cat.name.toLowerCase() === trimmedName.toLowerCase())

    if (existingCategory) {
      return existingCategory.id
    }

    // Create new category
    const newCategoryId = Date.now().toString()
    const newCategory: Category = {
      id: newCategoryId,
      name: trimmedName,
      color: generateColorFromString(trimmedName),
    }

    setCategories([...categories, newCategory])
    return newCategoryId
  }

  // Add a new task
  const addTask = () => {
    if (newTask.trim() !== "") {
      // Get or create the category
      const categoryId = getOrCreateCategory(
        newCategoryInput || categories.find((c) => c.id === newTaskCategory)?.name || "General",
      )

      const newTaskObj: Task = {
        id: Date.now().toString(),
        text: newTask.trim(),
        completed: false,
        createdAt: new Date(),
        deadline: null,
        subtasks: [],
        expanded: false,
        categoryId: categoryId,
        priority: newTaskPriority,
      }
      setTasks([...tasks, newTaskObj])
      setNewTask("")
      setNewCategoryInput("")
      setNewTaskPriority(0)
    }
  }

  // Add a subtask to a parent task
  const addSubtask = (parentId: string) => {
    if (newSubtask.trim() === "") return

    // Category is optional for subtasks
    const categoryId = newCategoryInput ? getOrCreateCategory(newCategoryInput) : undefined

    const updatedTasks = updateTasksRecursively(tasks, parentId, (task) => {
      const newSubtaskObj: Task = {
        id: `${parentId}-${Date.now()}`,
        text: newSubtask.trim(),
        completed: false,
        createdAt: new Date(),
        deadline: null,
        subtasks: [],
        expanded: false,
        // Only add categoryId if one was provided
        ...(categoryId && { categoryId }),
        priority: 0, // Default priority for subtasks
      }

      return {
        ...task,
        expanded: true,
        subtasks: [...task.subtasks, newSubtaskObj],
      }
    })

    setTasks(updatedTasks)
    setNewSubtask("")
    setNewCategoryInput("")
    setCurrentTaskId(null)
  }

  // Helper function to update tasks recursively
  const updateTasksRecursively = (taskList: Task[], taskId: string, updateFn: (task: Task) => Task): Task[] => {
    return taskList.map((task) => {
      if (task.id === taskId) {
        return updateFn(task)
      }

      if (task.subtasks.length > 0) {
        return {
          ...task,
          subtasks: updateTasksRecursively(task.subtasks, taskId, updateFn),
        }
      }

      return task
    })
  }

  // Toggle task completion status
  const toggleTaskCompletion = (taskId: string) => {
    const toggleCompletionRecursively = (taskList: Task[]): Task[] => {
      return taskList.map((task) => {
        if (task.id === taskId) {
          // Toggle the completion status of this task
          const newCompletedStatus = !task.completed

          // If we're marking as complete, also mark all subtasks as complete
          // If we're marking as incomplete, leave subtasks as they are
          const updatedSubtasks = newCompletedStatus
            ? task.subtasks.map((st) => ({ ...st, completed: true }))
            : task.subtasks

          return {
            ...task,
            completed: newCompletedStatus,
            subtasks: updatedSubtasks,
          }
        }

        // Check if the task we're looking for is in the subtasks
        if (task.subtasks.length > 0) {
          const updatedSubtasks = toggleCompletionRecursively(task.subtasks)

          // Check if all subtasks are completed to update parent status
          const allSubtasksCompleted = updatedSubtasks.every((st) => st.completed)

          return {
            ...task,
            subtasks: updatedSubtasks,
            // Only auto-complete parent if all subtasks are completed
            completed: task.subtasks.length > 0 ? allSubtasksCompleted : task.completed,
          }
        }

        return task
      })
    }

    setTasks(toggleCompletionRecursively(tasks))
  }

  // Toggle task expanded state
  const toggleTaskExpanded = (taskId: string) => {
    setTasks(
      updateTasksRecursively(tasks, taskId, (task) => ({
        ...task,
        expanded: !task.expanded,
      })),
    )
  }

  // Set deadline for a task
  const setTaskDeadline = (taskId: string, date: Date | null) => {
    setTasks(
      updateTasksRecursively(tasks, taskId, (task) => ({
        ...task,
        deadline: date,
      })),
    )
  }

  // Set priority for a task
  const setTaskPriority = (taskId: string, priority: number) => {
    setTasks(
      updateTasksRecursively(tasks, taskId, (task) => ({
        ...task,
        priority,
      })),
    )
  }

  // Delete a task
  const deleteTask = (taskId: string) => {
    // Function to filter out the task with the given ID recursively
    const filterTasksRecursively = (taskList: Task[]): Task[] => {
      return taskList
        .filter((task) => task.id !== taskId)
        .map((task) => ({
          ...task,
          subtasks: filterTasksRecursively(task.subtasks),
        }))
    }

    setTasks(filterTasksRecursively(tasks))
  }

  // Clear all completed tasks
  const clearCompleted = () => {
    // Function to filter out completed tasks recursively
    const filterCompletedRecursively = (taskList: Task[]): Task[] => {
      return taskList
        .filter((task) => !task.completed)
        .map((task) => ({
          ...task,
          subtasks: filterCompletedRecursively(task.subtasks),
        }))
    }

    setTasks(filterCompletedRecursively(tasks))
  }

  // Toggle category filter
  const toggleCategoryFilter = (categoryId: string) => {
    setActiveCategoryFilters((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Clear all category filters
  const clearCategoryFilters = () => {
    setActiveCategoryFilters([])
  }

  // Get deadline status for styling
  const getDeadlineStatus = (deadline: Date | null | undefined) => {
    if (!deadline) return "none"

    const today = new Date()
    const daysUntilDeadline = differenceInDays(deadline, today)

    if (daysUntilDeadline < 0) return "overdue"
    if (daysUntilDeadline <= 3) return "soon"
    return "normal"
  }

  // Get color class based on deadline status
  const getDeadlineColorClass = (status: string) => {
    switch (status) {
      case "overdue":
        return "text-red-500"
      case "soon":
        return "text-yellow-500"
      case "normal":
        return "text-green-500"
      default:
        return ""
    }
  }

  // Flatten tasks for filtering
  const flattenTasks = (taskList: Task[]): Task[] => {
    return taskList.reduce((acc: Task[], task) => {
      return [...acc, task, ...flattenTasks(task.subtasks)]
    }, [])
  }

  // Filter tasks based on active filter and category filters
  const getFilteredRootTasks = () => {
    let filtered = tasks

    // Apply category filters if any are active
    if (activeCategoryFilters.length > 0) {
      filtered = filtered.filter((task) => {
        // Check if this task's category is in the active filters
        const taskMatches = task.categoryId && activeCategoryFilters.includes(task.categoryId)

        // Check if any subtask's category is in the active filters (recursively)
        const hasMatchingSubtask = (subtasks: Task[]): boolean => {
          return subtasks.some(
            (subtask) =>
              (subtask.categoryId && activeCategoryFilters.includes(subtask.categoryId)) ||
              hasMatchingSubtask(subtask.subtasks),
          )
        }

        return taskMatches || hasMatchingSubtask(task.subtasks)
      })
    }

    // Apply completion status filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((task) => {
        const taskMatches = activeFilter === "active" ? !task.completed : task.completed
        const anySubtaskMatches = task.subtasks.some((subtask) =>
          activeFilter === "active" ? !subtask.completed : subtask.completed,
        )

        return taskMatches || anySubtaskMatches
      })
    }

    // Sort tasks by priority (descending)
    return [...filtered].sort((a, b) => b.priority - a.priority)
  }

  // Count remaining active tasks (including subtasks)
  const remainingTasks = flattenTasks(tasks).filter((task) => !task.completed).length

  // Get category by ID
  const getCategoryById = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId) || { id: "default", name: "General", color: "#6366f1" }
  }

  const updateTaskText = (taskId: string, newText: string) => {
    if (newText.trim() === "") return

    setTasks(
      updateTasksRecursively(tasks, taskId, (task) => ({
        ...task,
        text: newText.trim(),
      })),
    )

    setEditingTaskId(null)
    setEditTaskText("")
  }

  // Sort subtasks by priority
  const sortTasksByPriority = (taskList: Task[]): Task[] => {
    return [...taskList]
      .sort((a, b) => b.priority - a.priority)
      .map((task) => ({
        ...task,
        subtasks: sortTasksByPriority(task.subtasks),
      }))
  }

  // Render a task and its subtasks recursively
  const renderTask = (task: Task, level = 0) => {
    const deadlineStatus = getDeadlineStatus(task.deadline)
    const deadlineColorClass = getDeadlineColorClass(deadlineStatus)
    const category = task.categoryId ? getCategoryById(task.categoryId) : null
    const priorityColor = getPriorityColor(task.priority)
    const priorityLabel = getPriorityLabel(task.priority)

    return (
      <li key={task.id} className="space-y-2">
        <div
          className={cn(
            "flex md:flex-row flex-col items-center justify-between rounded-md border border-slate-700 p-3 transition-colors hover:bg-slate-800",
            {
              "ml-6": level === 1,
              "ml-12": level === 2,
              "ml-16": level >= 3,
            },
          )}
        >
          <div className="flex items-center space-x-3 flex-grow overflow-hidden">
            {task.subtasks.length > 0 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleTaskExpanded(task.id)}>
                {task.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="sr-only">{task.expanded ? "Collapse" : "Expand"}</span>
              </Button>
            )}
            {/* Add a spacer if there are no subtasks to maintain alignment */}
            {task.subtasks.length === 0 && <div className="w-6"></div>}

            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleTaskCompletion(task.id)}>
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-400" />
              )}
              <span className="sr-only">{task.completed ? "Mark as incomplete" : "Mark as complete"}</span>
            </Button>

            {/* Priority indicator */}
            <div
              className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium"
              style={{
                backgroundColor: task.priority > 0 ? `${priorityColor}30` : "transparent",
                color: priorityColor,
                border: task.priority > 0 ? `1px solid ${priorityColor}` : "none",
              }}
              title={`Priority: ${priorityLabel} (${task.priority}/10)`}
            >
              {task.priority > 0 ? task.priority : ""}
            </div>

            {/* Task text and category */}
            <div className="flex flex-col flex-1 overflow-auto">
              {editingTaskId === task.id ? (
                <Input
                  type="text"
                  value={editTaskText}
                  onChange={(e) => setEditTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateTaskText(task.id, editTaskText)
                    if (e.key === "Escape") {
                      setEditingTaskId(null)
                      setEditTaskText("")
                    }
                  }}
                  onBlur={() => updateTaskText(task.id, editTaskText)}
                  className="h-7 text-sm w-full"
                  autoFocus
                />
              ) : (
                <span
                  className={`text-sm ${task.completed ? "text-slate-500 line-through" : "text-slate-200"} cursor-pointer hover:text-slate-100 flex-1`}
                  onClick={() => {
                    setEditingTaskId(task.id)
                    setEditTaskText(task.text)
                  }}
                >
                  {task.text}
                </span>
              )}
              {category && (
                <Badge
                  variant="outline"
                  className="mt-1 w-fit"
                  style={{
                    borderColor: category.color,
                    color: category.color,
                    backgroundColor: `${category.color}20`, // 20% opacity
                  }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              )}
            </div>

            {/* Add subtask button */}
            {currentTaskId === task.id ? (
              <div className="flex items-center ml-2 flex-grow">
                <div className="flex flex-col space-y-2 w-full">
                  <Input
                    type="text"
                    placeholder="Add subtask..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) addSubtask(task.id)
                      if (e.key === "Escape") {
                        setCurrentTaskId(null)
                        setNewSubtask("")
                        setNewCategoryInput("")
                      }
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => addSubtask(task.id)}
                      className="h-7 px-2 text-xs"
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCurrentTaskId(null)
                        setNewSubtask("")
                        setNewCategoryInput("")
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentTaskId(task.id)
                }}
                className="ml-2 h-6 px-2 text-xs"
              >
                + Subtask
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-1 w-full justify-end md:w-auto">
            {/* Deadline indicator */}
            {task.deadline && (
              <div className={`flex items-center text-xs ${deadlineColorClass}`}>
                {deadlineStatus === "overdue" && <AlertCircle className="h-3 w-3 mr-1" />}
                {deadlineStatus === "soon" && <Clock className="h-3 w-3 mr-1" />}
                {format(task.deadline, "MMM d")}
              </div>
            )}

            {/* Priority setter */}
            <Popover
              open={editingPriorityTaskId === task.id}
              onOpenChange={(open) => {
                if (open) {
                  setEditingPriorityTaskId(task.id)
                  setTempPriority(task.priority)
                } else {
                  if (editingPriorityTaskId) {
                    setTaskPriority(task.id, tempPriority)
                  }
                  setEditingPriorityTaskId(null)
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" style={{ color: priorityColor }}>
                  <Flag className="h-4 w-4" />
                  <span className="sr-only">Set priority</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Priority</h4>
                    <Badge
                      variant={tempPriority > 0 ? "default" : "outline"}
                      style={{
                        backgroundColor: getPriorityColor(tempPriority),
                        color: tempPriority >= 5 ? "white" : "black",
                      }}
                    >
                      {getPriorityLabel(tempPriority)} ({tempPriority})
                    </Badge>
                  </div>
                  <Slider
                    value={[tempPriority]}
                    max={10}
                    step={1}
                    onValueChange={(value) => setTempPriority(value[0])}
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Deadline picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Calendar className="h-4 w-4" />
                  <span className="sr-only">Set deadline</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={task.deadline || undefined}
                  onSelect={(date) => setTaskDeadline(task.id, date || null)}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-red-500"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete task</span>
            </Button>
          </div>
        </div>

        {/* Render subtasks if expanded */}
        {task.expanded && task.subtasks.length > 0 && (
          <ul className="space-y-2">
            {sortTasksByPriority(task.subtasks).filter((subtask) => {
              // If active category is "active", show only active subtasks
              if (activeFilter === "active") {
                return !subtask.completed
              }
              // If active category is "completed", show only completed subtasks
              if (activeFilter === "completed") {
                return subtask.completed
              }
              // Otherwise, show all subtasks
              return true
            }).map((subtask) => renderTask(subtask, level + 1))}
          </ul>
        )}
      </li>
    )
  }

  const filteredRootTasks = getFilteredRootTasks()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center inset-0 z-50 p-4 dark">
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-black via-violet-900 to-black">
        <div className="absolute inset-0 opacity-20">
          <div className="bggrid absolute left-0 top-0 grid size-full grid-cols-12 grid-rows-12 gap-4">
          {Array.from({ length: 144 }).map((_, i) => {
            const delay = `${((i % 12) + (Math.floor(i / 12))) * 0.1}s`; // Diagonal wave
            return (
              <div
                key={i}
                className="rounded-md bg-white shadow-xl"
                style={{ '--delay': delay } as React.CSSProperties}
              />
            );
          })}
          </div>
        </div>
        <div className="absolute inset-0 bg-black/50 pointer-events-none backdrop-blur-sm" />
      </div>
      <Card className="w-full max-w-2xl shadow-lg relative">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Ceos - TODO APP</CardTitle>
            <Badge variant="outline" className="font-normal">
              {remainingTasks} item{remainingTasks !== 1 ? "s" : ""} left
            </Badge>
          </div>
          <CardDescription>Manage tasks with categories, subtasks and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add task form */}
          <div className="flex flex-col space-y-2">
            <Input
              type="text"
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) addTask()
              }}
              className="flex-1"
            />

            {/* Priority slider for new task */}
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">Priority:</label>
                <Badge
                  variant={newTaskPriority > 0 ? "default" : "outline"}
                  style={{
                    backgroundColor: getPriorityColor(newTaskPriority),
                    color: newTaskPriority >= 5 ? "white" : "black",
                  }}
                >
                  {getPriorityLabel(newTaskPriority)} ({newTaskPriority})
                </Badge>
              </div>
              <Slider
                value={[newTaskPriority]}
                max={10}
                step={1}
                onValueChange={(value) => setNewTaskPriority(value[0])}
              />
            </div>

            {/* Category selector and add button */}
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="flex-1 justify-between">
                    {newCategoryInput || getCategoryById(newTaskCategory).name}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandInput
                      placeholder="Search or add category..."
                      value={newCategoryInput}
                      onValueChange={setNewCategoryInput}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {newCategoryInput ? `Create "${newCategoryInput}"` : "No categories found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {categories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.name}
                            onSelect={(value) => {
                              const selectedCategory = categories.find(
                                (cat) => cat.name.toLowerCase() === value.toLowerCase(),
                              )
                              if (selectedCategory) {
                                setNewTaskCategory(selectedCategory.id)
                                setNewCategoryInput("")
                              }
                            }}
                          >
                            <div className="mr-2 h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button onClick={addTask} size="icon" variant="outline">
                <PlusCircle className="h-5 w-5" />
                <span className="sr-only">Add task</span>
              </Button>
            </div>
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={activeCategoryFilters.includes(category.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  style={
                    activeCategoryFilters.includes(category.id)
                      ? { backgroundColor: category.color, color: "#000", borderColor: category.color }
                      : { borderColor: category.color, color: category.color }
                  }
                  onClick={() => toggleCategoryFilter(category.id)}
                >
                  {category.name}
                  {activeCategoryFilters.includes(category.id) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
              {activeCategoryFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCategoryFilters} className="h-6 px-2 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {/* Task filters */}
          <Tabs defaultValue="all" value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {/* Task list */}
            <TabsContent value={activeFilter} className="mt-4">
              {filteredRootTasks.length > 0 ? (
                <ul className="space-y-4">{filteredRootTasks.map((task) => renderTask(task))}</ul>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-700">
                  <p className="text-sm text-slate-400">No tasks found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Legends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Deadline legend */}
            <div className="flex items-center justify-start space-x-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                <span className="text-slate-300">Overdue</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
                <span className="text-slate-300">Due soon</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                <span className="text-slate-300">On track</span>
              </div>
            </div>

            {/* Priority legend */}
            <div className="flex items-center justify-start space-x-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                <span className="text-slate-300">High (8-10)</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1"></span>
                <span className="text-slate-300">Medium (5-7)</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-1"></span>
                <span className="text-slate-300">Low (1-4)</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-slate-400">Tasks are sorted by priority (highest first)</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompleted}
            className="text-xs"
            disabled={!flattenTasks(tasks).some((task) => task.completed)}
          >
            Clear completed
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
