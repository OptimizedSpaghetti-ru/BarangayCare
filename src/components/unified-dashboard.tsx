import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Search, 
  Filter, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  TrendingUp,
  FileText,
  User
} from 'lucide-react';
import { useAuth } from './auth/auth-context';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  photo?: string;
  contactInfo: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  dateSubmitted: string;
  priority: 'low' | 'medium' | 'high';
  adminNotes?: string;
  respondent?: string;
  userId?: string;
  userName?: string;
}

interface UnifiedDashboardProps {
  complaints: Complaint[];
  onViewDetails: (complaint: Complaint) => void;
  isAdmin?: boolean;
}

export function UnifiedDashboard({ complaints, onViewDetails, isAdmin = false }: UnifiedDashboardProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Show all complaints
  const baseComplaints = complaints;

  // Apply search and filters
  const filteredComplaints = baseComplaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Statistics for current view
  const stats = {
    total: baseComplaints.length,
    pending: baseComplaints.filter(c => c.status === 'pending').length,
    inProgress: baseComplaints.filter(c => c.status === 'in-progress').length,
    resolved: baseComplaints.filter(c => c.status === 'resolved').length,
    rejected: baseComplaints.filter(c => c.status === 'rejected').length,
  };

  const categories = [...new Set(complaints.map(c => c.category))];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
              <User className="w-6 h-6" />
              <span>
                {isAdmin 
                  ? 'Admin Dashboard - BarangayCARE' 
                  : `Welcome back, ${user?.name}!`
                }
              </span>
            </h1>
            <p className="mt-2 opacity-90 text-sm sm:text-base">
              {isAdmin 
                ? 'Monitor and manage all community requests and user activities'
                : 'Track your community requests and stay updated on their progress'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-xl sm:text-2xl">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-xl sm:text-2xl">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span className="text-xl sm:text-2xl">{stats.inProgress}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-xl sm:text-2xl">{stats.resolved}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-xl sm:text-2xl">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>
              {isAdmin ? 'All Community Requests' : 'Community Requests'}
            </span>
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'Monitor and manage all community requests'
              : 'View all community requests and their current status'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Request List */}
            <div className="space-y-4">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {baseComplaints.length === 0 
                      ? "No requests in the system"
                      : "No requests match your filters"
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {baseComplaints.length === 0 
                      ? "The community hasn't submitted any requests yet"
                      : "Try adjusting your search or filter criteria"
                    }
                  </p>

                </div>
              ) : (
                filteredComplaints.map((complaint) => (
                  <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium truncate">{complaint.title}</h3>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <div
                                className={`w-3 h-3 rounded-full ${getPriorityColor(complaint.priority)}`}
                              />
                              <Badge className={`${getStatusColor(complaint.status)} border-0 flex items-center space-x-1`}>
                                {getStatusIcon(complaint.status)}
                                <span className="capitalize">{complaint.status.replace('-', ' ')}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {complaint.description}
                          </p>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{complaint.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(complaint.dateSubmitted)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 justify-end sm:justify-end flex-shrink-0">
                          {complaint.photo && (
                            <ImageWithFallback
                              src={complaint.photo}
                              alt="Request evidence"
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(complaint)}
                            className="flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}