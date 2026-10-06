import { Link } from 'react-router-dom'
import { Calendar, Columns3, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectRowActions } from './ProjectRowActions'
import type { ProjectListProps } from './ProjectsTable'

export function ProjectCards({ projects, boardHref, onEdit, onToggle }: ProjectListProps) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      {projects.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg truncate min-w-0">{item.project_name}</h3>
              <div className="shrink-0">
                <ProjectRowActions project={item} boardHref={boardHref(item)} onEdit={onEdit} onToggle={onToggle} />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant={item.status === 'active' ? 'success' : 'muted'}>{item.status}</Badge>
            </div>
            {item.description && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                <Calendar className="h-3 w-3" />
                Deadline {formatDate(item.deadline)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                <Users className="h-3 w-3" />
                {item.employees?.length ?? 0} members
              </span>
              <Badge variant="secondary">{item.tasks_count ?? 0} tasks</Badge>
            </div>
            {!!item.departments?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.departments.map((d) => (
                  <Badge key={d.id} variant="outline">{d.department}</Badge>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-border">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={boardHref(item)}>
                  <Columns3 className="h-4 w-4" />
                  Open Kanban Board
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
