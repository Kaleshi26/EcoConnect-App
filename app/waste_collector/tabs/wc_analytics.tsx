import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
    collection,
    onSnapshot,
    query,
    Timestamp,
    where
} from "firebase/firestore";
import {
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Package,
    Share2,
    TrendingUp
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

type WasteCollection = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  collectorId: string;
  collectorEmail: string;
  location?: { label?: string; lat?: number; lng?: number };
  collectedWeights: Record<string, string>;
  proofImages: string[];
  wasteTypes: string[];
  status: string;
  collectedAt?: Timestamp;
  createdAt?: Timestamp;
  completedAt?: Timestamp;
  estimatedQuantity?: string;
  priority?: string;
  organizerId?: string;
};

function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || "";
  const [wasteCollections, setWasteCollections] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'all'>('monthly');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [generatedReportContent, setGeneratedReportContent] = useState('');
  const screenWidth = Dimensions.get('window').width;

  // Fetch waste collections
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query without orderBy to avoid index requirement, sort on client side
    const q = query(
      collection(db, "wasteCollections"),
      where("collectorId", "==", userId)
    );
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        let collections: WasteCollection[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WasteCollection, "id">)
        }));
        
        // Sort by completedAt on the client side (newest first)
        collections = collections.sort((a, b) => {
          const dateA = tsToDate(a.completedAt)?.getTime() || 0;
          const dateB = tsToDate(b.completedAt)?.getTime() || 0;
          return dateB - dateA;
        });
        
        setWasteCollections(collections);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching waste collections:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);
  
  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <View 
          style={{
            backgroundColor: '#ffffff',
            padding: 32,
            borderRadius: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-gray-700 mt-4 font-semibold text-base">Loading Analytics...</Text>
        </View>
      </View>
    );
  }

  // Calculate comprehensive waste statistics
  const wasteAnalytics = useMemo(() => {
    // All wasteCollections are completed by definition
    const completedCollections = wasteCollections;
    
    let stats = {
      totalWeight: 0,
      plasticBottles: 0,
      plasticBags: 0,
      fishingGear: 0,
      glass: 0,
      cans: 0,
      other: 0
    };

    completedCollections.forEach(collection => {
      if (collection.collectedWeights) {
        Object.entries(collection.collectedWeights).forEach(([type, weight]) => {
          const weightNum = parseFloat(weight) || 0;
          const normalizedType = type.toLowerCase().replace(/\s+/g, '');
          
          stats.totalWeight += weightNum;
          
          switch (normalizedType) {
            case 'plasticbottles':
              stats.plasticBottles += weightNum;
              break;
            case 'plasticbags':
              stats.plasticBags += weightNum;
              break;
            case 'fishinggear':
              stats.fishingGear += weightNum;
              break;
            case 'glass':
              stats.glass += weightNum;
              break;
            case 'cans':
              stats.cans += weightNum;
              break;
            case 'other':
              stats.other += weightNum;
              break;
            default:
              if (type.toLowerCase().includes('plastic') && type.toLowerCase().includes('bottle')) {
                stats.plasticBottles += weightNum;
              } else if (type.toLowerCase().includes('plastic') && type.toLowerCase().includes('bag')) {
                stats.plasticBags += weightNum;
              } else if (type.toLowerCase().includes('fishing')) {
                stats.fishingGear += weightNum;
              } else if (type.toLowerCase().includes('glass')) {
                stats.glass += weightNum;
              } else if (type.toLowerCase().includes('can')) {
                stats.cans += weightNum;
              } else {
                stats.other += weightNum;
              }
              break;
          }
        });
      }
    });

    // Calculate percentages
    const wasteTypes = [
      { name: 'Plastic Bottles', value: stats.plasticBottles, color: '#3b82f6' },
      { name: 'Plastic Bags', value: stats.plasticBags, color: '#10b981' },
      { name: 'Fishing Gear', value: stats.fishingGear, color: '#f59e0b' },
      { name: 'Glass', value: stats.glass, color: '#ef4444' },
      { name: 'Cans', value: stats.cans, color: '#8b5cf6' },
      { name: 'Other', value: stats.other, color: '#6b7280' }
    ].filter(item => item.value > 0);

    // Calculate monthly data for trend analysis
    const monthlyData: Record<string, number> = {};
    completedCollections.forEach(collection => {
      if (collection.completedAt && collection.collectedWeights) {
        const date = tsToDate(collection.completedAt);
        if (date) {
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          const totalWeight = Object.values(collection.collectedWeights).reduce((sum, weight) => {
            return sum + (parseFloat(weight) || 0);
          }, 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + totalWeight;
        }
      }
    });

    // Calculate performance metrics
    const completionRate = 100; // All wasteCollections are completed
    const averageWeightPerAssignment = completedCollections.length > 0 ? stats.totalWeight / completedCollections.length : 0;
    
    // Calculate weekly data
    const weeklyData: Record<string, number> = {};
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    completedCollections.forEach(collection => {
      if (collection.completedAt) {
        const date = tsToDate(collection.completedAt);
        if (date && date >= weekAgo) {
          const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
          const totalWeight = Object.values(collection.collectedWeights || {}).reduce((sum, weight) => {
            return sum + (parseFloat(weight) || 0);
          }, 0);
          weeklyData[dayKey] = (weeklyData[dayKey] || 0) + totalWeight;
        }
      }
    });
    
    
    return {
      ...stats,
      completedAssignments: completedCollections.length,
      totalAssignments: completedCollections.length,
      pendingAssignments: 0,
      inProgressAssignments: 0,
      completionRate,
      averageWeightPerAssignment,
      wasteTypeBreakdown: wasteTypes,
      monthlyTrend: Object.entries(monthlyData).map(([month, weight]) => ({
        month,
        weight
      })).slice(-6), // Last 6 months
      weeklyTrend: Object.entries(weeklyData).map(([day, weight]) => ({
        day,
        weight
      }))
    };
  }, [wasteCollections]);

  // Share Report Function (PDF)
  const shareReport = async (htmlContent: string, reportTitle: string) => {
    try {
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false 
      });
      
      console.log('PDF created successfully:', uri);
      
      // Share the PDF
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Waste Collection Report',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      } else {
        Alert.alert('Error', 'Sharing is not available on this platform.');
      }
      
      Alert.alert(
        'Success',
        'PDF report shared successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sharing PDF report:', error);
      Alert.alert('Error', 'Failed to share PDF report. Please try again.');
    }
  };

  // Save Report Function (PDF)
  const saveReport = async (htmlContent: string) => {
    try {
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false 
      });
      
      console.log('PDF saved successfully:', uri);
      
      // Copy to documents directory with a better name
      const fileName = `WasteCollection_Report_${reportType}_${Date.now()}.pdf`;
      const file = new File(Paths.document, fileName);
      const sourcePdf = new File(uri);
      
      sourcePdf.copy(file);
      
      Alert.alert(
        'Success',
        `PDF report saved to:\n${file.name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving PDF report:', error);
      Alert.alert('Error', 'Failed to save PDF report. Please try again.');
    }
  };

  // Generate Report Function
  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Filter collections based on report type
      let filteredCollections = wasteCollections;
      const now = new Date();
      
      if (reportType === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredCollections = filteredCollections.filter(collection => {
          if (!collection.completedAt) return false;
          const date = tsToDate(collection.completedAt);
          return date && date >= weekAgo;
        });
      } else if (reportType === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredCollections = filteredCollections.filter(collection => {
          if (!collection.completedAt) return false;
          const date = tsToDate(collection.completedAt);
          return date && date >= monthAgo;
        });
      }

      // Calculate stats for filtered collections
      let reportStats = {
        totalWeight: 0,
        plasticBottles: 0,
        plasticBags: 0,
        fishingGear: 0,
        glass: 0,
        cans: 0,
        other: 0
      };

      filteredCollections.forEach(collection => {
        if (collection.collectedWeights) {
          Object.entries(collection.collectedWeights).forEach(([type, weight]) => {
            const weightNum = parseFloat(weight) || 0;
            const normalizedType = type.toLowerCase().replace(/\s+/g, '');
            
            reportStats.totalWeight += weightNum;
            
            switch (normalizedType) {
              case 'plasticbottles':
                reportStats.plasticBottles += weightNum;
                break;
              case 'plasticbags':
                reportStats.plasticBags += weightNum;
                break;
              case 'fishinggear':
                reportStats.fishingGear += weightNum;
                break;
              case 'glass':
                reportStats.glass += weightNum;
                break;
              case 'cans':
                reportStats.cans += weightNum;
                break;
              default:
                reportStats.other += weightNum;
                break;
            }
          });
        }
      });

      // Generate HTML report content for PDF
      const reportTitle = reportType === 'weekly' ? 'Weekly Report' : 
                         reportType === 'monthly' ? 'Monthly Report' : 
                         'All-Time Report';
      
      const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      padding: 40px;
      color: #1f2937;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .title {
      font-size: 22px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #6b7280;
    }
    .meta-info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
    }
    .meta-item {
      font-size: 12px;
    }
    .meta-label {
      color: #6b7280;
      font-weight: 600;
    }
    .meta-value {
      color: #1f2937;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      color: white;
      text-align: center;
    }
    .stat-card:nth-child(2) {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .stat-card:nth-child(3) {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
    }
    .waste-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .waste-table th {
      background: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 13px;
    }
    .waste-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    .waste-table tr:hover {
      background: #f9fafb;
    }
    .progress-bar {
      background: #e5e7eb;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-fill {
      background: #2563eb;
      height: 100%;
      border-radius: 4px;
    }
    .assignment-card {
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 6px;
    }
    .assignment-header {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .assignment-detail {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #dbeafe;
      color: #1e40af;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 6px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌊 EcoConnect</div>
    <div class="title">Waste Collection Report</div>
    <div class="subtitle">${reportTitle}</div>
  </div>

  <div class="meta-info">
    <div class="meta-item">
      <span class="meta-label">Generated:</span>
      <span class="meta-value">${now.toLocaleDateString()} ${now.toLocaleTimeString()}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Collector ID:</span>
      <span class="meta-value">${userId}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Period:</span>
      <span class="meta-value">${reportTitle}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 Summary Statistics</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${reportStats.totalWeight.toFixed(1)}</div>
        <div class="stat-label">kg Total Waste</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${filteredCollections.length}</div>
        <div class="stat-label">Collections Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${filteredCollections.length > 0 ? (reportStats.totalWeight / filteredCollections.length).toFixed(1) : 0}</div>
        <div class="stat-label">kg Average per Collection</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">♻️ Waste Type Breakdown</div>
    <table class="waste-table">
      <thead>
        <tr>
          <th>Waste Type</th>
          <th>Weight (kg)</th>
          <th>Percentage</th>
          <th>Distribution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Plastic Bottles</strong></td>
          <td>${reportStats.plasticBottles.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.plasticBottles / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.plasticBottles / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td><strong>Plastic Bags</strong></td>
          <td>${reportStats.plasticBags.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.plasticBags / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.plasticBags / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td><strong>Fishing Gear</strong></td>
          <td>${reportStats.fishingGear.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.fishingGear / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.fishingGear / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td><strong>Glass</strong></td>
          <td>${reportStats.glass.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.glass / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.glass / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td><strong>Cans</strong></td>
          <td>${reportStats.cans.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.cans / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.cans / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td><strong>Other</strong></td>
          <td>${reportStats.other.toFixed(2)} kg</td>
          <td>${reportStats.totalWeight > 0 ? ((reportStats.other / reportStats.totalWeight) * 100).toFixed(1) : 0}%</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${reportStats.totalWeight > 0 ? ((reportStats.other / reportStats.totalWeight) * 100).toFixed(0) : 0}%"></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">📋 Detailed Collections</div>
    ${filteredCollections.map((collection, idx) => {
      const completedDate = collection.completedAt ? tsToDate(collection.completedAt) : null;
      const totalWeight = collection.collectedWeights ? 
        Object.values(collection.collectedWeights).reduce((sum, w) => sum + (parseFloat(w) || 0), 0) : 0;
      
      return `
        <div class="assignment-card">
          <div class="assignment-header">Collection #${idx + 1}: ${collection.eventTitle}</div>
          <div class="assignment-detail"><strong>📍 Location:</strong> ${collection.location?.label || 'N/A'}</div>
          <div class="assignment-detail"><strong>📅 Completed:</strong> ${completedDate ? completedDate.toLocaleDateString() : 'N/A'}</div>
          <div class="assignment-detail"><strong>⚖️ Weight Collected:</strong> ${totalWeight.toFixed(2)} kg</div>
          <div class="assignment-detail">
            <strong>🗑️ Waste Types:</strong>
            ${collection.wasteTypes?.map(wt => `<span class="badge">${wt}</span>`).join('') || 'N/A'}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <div class="section">
    <div class="section-title">📈 Performance Metrics</div>
    <table class="waste-table">
      <tr>
        <td><strong>Total Collections</strong></td>
        <td>${wasteCollections.length}</td>
      </tr>
      <tr>
        <td><strong>Collections in Report</strong></td>
        <td>${filteredCollections.length}</td>
      </tr>
      <tr>
        <td><strong>Average Weight per Collection</strong></td>
        <td>${wasteAnalytics.averageWeightPerAssignment.toFixed(2)} kg</td>
      </tr>
      <tr>
        <td><strong>Total Weight Collected</strong></td>
        <td>${reportStats.totalWeight.toFixed(2)} kg</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <strong>Generated by EcoConnect Waste Management System</strong><br>
    Protecting our oceans, one collection at a time 🌊
  </div>
</body>
</html>
`;

      // Store report content and show preview
      setGeneratedReportContent(reportContent);
      setShowReportModal(false);
      setShowReportPreview(true);
      
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Custom Pie Chart Component
  const CustomPieChart = ({ data }: { data: {name: string, value: number, color: string}[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const chartSize = 160;
    const center = chartSize / 2;
    const radius = 70;
    
    let currentAngle = 0;
    
    const segments = data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      // Calculate position for percentage labels
      const labelAngle = (startAngle + endAngle) / 2;
      const labelRadius = radius * 0.7;
      const labelX = center + labelRadius * Math.cos((labelAngle - 90) * Math.PI / 180);
      const labelY = center + labelRadius * Math.sin((labelAngle - 90) * Math.PI / 180);
      
      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        labelX,
        labelY
      };
    });

    return (
      <View className="items-center">
        <View style={{ width: chartSize, height: chartSize }} className="relative">
          {/* Chart Background */}
          <View 
            style={{
              width: chartSize,
              height: chartSize,
              borderRadius: chartSize / 2,
              backgroundColor: '#f3f4f6'
            }}
            className="absolute"
          />
          
          {/* Segments */}
          {segments.map((segment, index) => {
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const rotation = (segment.startAngle - 90);
            
            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  width: chartSize,
                  height: chartSize,
                  borderRadius: chartSize / 2,
                  borderWidth: 20,
                  borderColor: segment.color,
                  borderStyle: 'solid',
                  transform: [{ rotate: `${rotation}deg` }],
                }}
                className="opacity-80"
              />
            );
          })}
          
          {/* Center Circle */}
          <View 
            style={{
              position: 'absolute',
              width: chartSize - 40,
              height: chartSize - 40,
              borderRadius: (chartSize - 40) / 2,
              backgroundColor: 'white',
              top: 20,
              left: 20,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text className="text-2xl font-bold text-gray-900">{total.toFixed(1)}</Text>
            <Text className="text-sm text-gray-600">kg total</Text>
          </View>
        </View>
        
        {/* Legend */}
        <View className="flex-row flex-wrap justify-center mt-4">
          {segments.map((segment, index) => (
            <View key={index} className="flex-row items-center m-1 bg-gray-50 px-3 py-1 rounded-full">
              <View 
                style={{ backgroundColor: segment.color }}
                className="w-3 h-3 rounded-full mr-2"
              />
              <Text className="text-xs text-gray-700">{segment.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render pie chart data for Recharts
  const pieChartData = wasteAnalytics.wasteTypeBreakdown.map(item => ({
    name: item.name,
    value: item.value,
    fill: item.color
  }));

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <View 
          style={{
            backgroundColor: '#ffffff',
            padding: 32,
            borderRadius: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-gray-700 mt-4 font-semibold text-base">Loading Analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Curved Header Background */}
      <View 
        style={{
          backgroundColor: '#059669',
          height: 200,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        {/* Decorative circles */}
        <View style={{
          position: 'absolute',
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          top: -20,
          right: 30,
        }} />
        <View style={{
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          top: 100,
          left: 20,
        }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <View 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                padding: 12,
                borderRadius: 16,
                marginRight: 12,
              }}
            >
              <BarChart3 size={32} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-3xl font-bold text-white" style={{ letterSpacing: 0.5 }}>Analytics</Text>
              <Text className="text-emerald-50 text-base mt-1">Performance Overview</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics Row */}
        <View className="flex-row flex-wrap mb-6">
          <View className="w-1/2 pr-2 mb-4">
            <View 
              style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 5,
                borderLeftColor: '#10b981',
              }}
            >
              <View className="flex-row items-center mb-3">
                <View style={{ backgroundColor: '#d1fae5', padding: 8, borderRadius: 12 }}>
                  <Package size={20} color="#059669" />
                </View>
                <Text className="text-gray-600 text-sm ml-2 font-medium">Total Weight</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">{wasteAnalytics.totalWeight.toFixed(1)}</Text>
              <Text className="text-emerald-600 text-xs font-semibold mt-1">kg collected</Text>
            </View>
          </View>
          
          <View className="w-1/2 pl-2 mb-4">
            <View 
              style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 5,
                borderLeftColor: '#3b82f6',
              }}
            >
              <View className="flex-row items-center mb-3">
                <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 12 }}>
                  <CheckCircle size={20} color="#2563eb" />
                </View>
                <Text className="text-gray-600 text-sm ml-2 font-medium">Completed</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">{wasteAnalytics.completedAssignments}</Text>
              <Text className="text-blue-600 text-xs font-semibold mt-1">assignments</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View className="flex-row flex-wrap mb-6">
          <View className="w-1/2 pr-2 mb-4">
            <View 
              style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 5,
                borderLeftColor: '#8b5cf6',
              }}
            >
              <View className="flex-row items-center mb-3">
                <View style={{ backgroundColor: '#ede9fe', padding: 8, borderRadius: 12 }}>
                  <TrendingUp size={20} color="#7c3aed" />
                </View>
                <Text className="text-gray-600 text-sm ml-2 font-medium">Efficiency</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">{wasteAnalytics.completionRate.toFixed(0)}%</Text>
              <Text className="text-purple-600 text-xs font-semibold mt-1">completion rate</Text>
            </View>
          </View>
          
          <View className="w-1/2 pl-2 mb-4">
            <View 
              style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 5,
                borderLeftColor: '#f59e0b',
              }}
            >
              <View className="flex-row items-center mb-3">
                <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 12 }}>
                  <Clock size={20} color="#d97706" />
                </View>
                <Text className="text-gray-600 text-sm ml-2 font-medium">Avg Weight</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">{wasteAnalytics.averageWeightPerAssignment.toFixed(1)}</Text>
              <Text className="text-amber-600 text-xs font-semibold mt-1">kg per assignment</Text>
            </View>
          </View>
        </View>

        {/* Weekly Performance Chart */}
        {wasteAnalytics.weeklyTrend.length > 0 && (
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center mb-5">
              <View style={{ backgroundColor: '#d1fae5', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <Calendar size={22} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">Weekly Performance</Text>
                <Text className="text-gray-500 text-xs mt-1">Last 7 days activity</Text>
              </View>
            </View>
            
            <View className="space-y-3">
              {wasteAnalytics.weeklyTrend.map((item, index) => {
                const maxWeight = Math.max(...wasteAnalytics.weeklyTrend.map(d => d.weight));
                const barWidth = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
                
                return (
                  <View key={index} className="flex-row items-center mb-3">
                    <Text className="text-gray-700 font-semibold text-sm w-14">{item.day}</Text>
                    <View 
                      style={{
                        flex: 1,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 12,
                        height: 36,
                        marginHorizontal: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <View 
                        style={{
                          width: `${Math.max(barWidth, 8)}%`,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: '#10b981',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: 12,
                        }}
                      >
                        {barWidth > 20 && (
                          <Text className="text-white text-xs font-bold">
                            {item.weight.toFixed(1)}kg
                          </Text>
                        )}
                      </View>
                    </View>
                    {barWidth <= 20 && (
                      <Text className="text-gray-600 text-xs font-semibold w-12 text-right">
                        {item.weight.toFixed(1)}kg
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Waste Type Distribution */}
        {wasteAnalytics.wasteTypeBreakdown.length > 0 && (
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center mb-5">
              <View style={{ backgroundColor: '#dbeafe', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <Package size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">Waste Distribution</Text>
                <Text className="text-gray-500 text-xs mt-1">Breakdown by type</Text>
              </View>
            </View>
            
            {/* Detailed breakdown */}
            <View className="space-y-2">
              {wasteAnalytics.wasteTypeBreakdown.map((item, index) => (
                <View 
                  key={index} 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    backgroundColor: '#f9fafb',
                    borderRadius: 14,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: item.color,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View 
                      style={{ 
                        backgroundColor: item.color,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        marginRight: 12,
                      }}
                    />
                    <Text className="font-semibold text-gray-800 text-base">{item.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-gray-900 text-lg">{item.value.toFixed(1)} kg</Text>
                    <View 
                      style={{
                        backgroundColor: item.color,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text className="text-xs text-white font-bold">
                        {((item.value / wasteAnalytics.totalWeight) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}


        {/* Empty State */}
        {wasteAnalytics.totalWeight === 0 && (
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View style={{ backgroundColor: '#f3f4f6', padding: 20, borderRadius: 999, marginBottom: 16 }}>
              <BarChart3 size={40} color="#9ca3af" />
            </View>
            <Text className="text-gray-700 text-center font-bold text-lg mb-2">
              No Analytics Yet
            </Text>
            <Text className="text-gray-500 text-center text-sm">
              Complete waste collection assignments to see your performance metrics and insights
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Report Generation Button */}
      {wasteAnalytics.totalWeight > 0 && (
        <Pressable
          onPress={() => setShowReportModal(true)}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: '#059669',
            borderRadius: 30,
            paddingVertical: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <FileText size={24} color="white" strokeWidth={2.5} />
          <Text className="text-white font-bold ml-2 text-base">Generate Report</Text>
        </Pressable>
      )}

      {/* Report Generation Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
            {/* Modal Header */}
            <View className="flex-row items-center mb-6">
              <View className="bg-blue-100 p-3 rounded-2xl mr-3">
                <FileText size={28} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">Generate Report</Text>
                <Text className="text-gray-600 text-sm">Choose report type</Text>
              </View>
            </View>

            {/* Report Type Options */}
            <View className="space-y-3 mb-6">
              <Pressable
                onPress={() => setReportType('weekly')}
                className={`flex-row items-center p-4 rounded-xl border-2 ${
                  reportType === 'weekly' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  reportType === 'weekly' ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {reportType === 'weekly' && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${
                    reportType === 'weekly' ? 'text-blue-700' : 'text-gray-900'
                  }`}>Weekly Report</Text>
                  <Text className="text-gray-600 text-xs">Last 7 days of data</Text>
                </View>
                <Calendar size={20} color={reportType === 'weekly' ? '#2563eb' : '#9ca3af'} />
              </Pressable>

              <Pressable
                onPress={() => setReportType('monthly')}
                className={`flex-row items-center p-4 rounded-xl border-2 ${
                  reportType === 'monthly' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  reportType === 'monthly' ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {reportType === 'monthly' && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${
                    reportType === 'monthly' ? 'text-blue-700' : 'text-gray-900'
                  }`}>Monthly Report</Text>
                  <Text className="text-gray-600 text-xs">Last 30 days of data</Text>
                </View>
                <Calendar size={20} color={reportType === 'monthly' ? '#2563eb' : '#9ca3af'} />
              </Pressable>

              <Pressable
                onPress={() => setReportType('all')}
                className={`flex-row items-center p-4 rounded-xl border-2 ${
                  reportType === 'all' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  reportType === 'all' ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {reportType === 'all' && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${
                    reportType === 'all' ? 'text-blue-700' : 'text-gray-900'
                  }`}>All-Time Report</Text>
                  <Text className="text-gray-600 text-xs">Complete history</Text>
                </View>
                <BarChart3 size={20} color={reportType === 'all' ? '#2563eb' : '#9ca3af'} />
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setShowReportModal(false)}
                disabled={generatingReport}
                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={generateReport}
                disabled={generatingReport}
                className="flex-1 bg-blue-600 py-3 rounded-xl items-center flex-row justify-center"
              >
                {generatingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Download size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">Generate</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Info Text */}
            <View className="mt-4 bg-blue-50 p-3 rounded-lg flex-row items-start">
              <Share2 size={16} color="#2563eb" className="mt-0.5" />
              <Text className="text-blue-700 text-xs ml-2 flex-1">
                A professional PDF report will be generated with charts, tables, and detailed statistics. Share via email, messaging apps, or save locally.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Preview Modal */}
      <Modal
        visible={showReportPreview}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowReportPreview(false)}
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="bg-blue-600 px-6 py-4 pt-12">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 p-2 rounded-lg mr-3">
                  <FileText size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Report Preview</Text>
                  <Text className="text-blue-100 text-sm">
                    {reportType === 'weekly' ? 'Weekly Report' : 
                     reportType === 'monthly' ? 'Monthly Report' : 
                     'All-Time Report'}
                  </Text>
                </View>
              </View>
              <Pressable 
                onPress={() => setShowReportPreview(false)}
                className="bg-white/20 p-2 rounded-lg"
              >
                <Text className="text-white font-bold">✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Report Content */}
          <ScrollView className="flex-1 bg-gray-50 p-4">
            <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <View className="flex-row items-center mb-3">
                <View className="bg-red-100 p-2 rounded-lg mr-3">
                  <FileText size={20} color="#dc2626" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-gray-900">PDF Report Ready</Text>
                  <Text className="text-sm text-gray-600">
                    {reportType === 'weekly' ? 'Last 7 days' : 
                     reportType === 'monthly' ? 'Last 30 days' : 
                     'All-time data'}
                  </Text>
                </View>
              </View>
              <View className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Text className="text-blue-800 text-sm font-semibold mb-2">📄 Report Contents:</Text>
                <Text className="text-blue-700 text-xs">✓ Summary Statistics</Text>
                <Text className="text-blue-700 text-xs">✓ Waste Type Breakdown with Charts</Text>
                <Text className="text-blue-700 text-xs">✓ Detailed Assignment Records</Text>
                <Text className="text-blue-700 text-xs">✓ Performance Metrics</Text>
              </View>
            </View>

            <View className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 shadow-sm">
              <Text className="text-gray-700 text-sm font-medium mb-2">📊 Quick Stats:</Text>
              <View className="space-y-2">
                <View className="flex-row justify-between items-center bg-white p-3 rounded-lg">
                  <Text className="text-gray-600 text-sm">Total Waste Collected</Text>
                  <Text className="text-blue-600 font-bold">{wasteAnalytics.totalWeight.toFixed(1)} kg</Text>
                </View>
                <View className="flex-row justify-between items-center bg-white p-3 rounded-lg">
                  <Text className="text-gray-600 text-sm">Assignments Completed</Text>
                  <Text className="text-green-600 font-bold">{wasteAnalytics.completedAssignments}</Text>
                </View>
                <View className="flex-row justify-between items-center bg-white p-3 rounded-lg">
                  <Text className="text-gray-600 text-sm">Efficiency Rate</Text>
                  <Text className="text-purple-600 font-bold">{wasteAnalytics.completionRate.toFixed(0)}%</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="bg-white border-t border-gray-200 p-4 pb-6">
            <View className="flex-row space-x-3">
              <Pressable
                onPress={async () => {
                  const reportTitle = reportType === 'weekly' ? 'Weekly Report' : 
                                     reportType === 'monthly' ? 'Monthly Report' : 
                                     'All-Time Report';
                  await shareReport(generatedReportContent, reportTitle);
                }}
                className="flex-1 bg-blue-600 py-4 rounded-xl flex-row items-center justify-center"
              >
                <Share2 size={20} color="white" />
                <Text className="text-white font-bold ml-2">Share PDF</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  await saveReport(generatedReportContent);
                }}
                className="flex-1 bg-green-600 py-4 rounded-xl flex-row items-center justify-center"
              >
                <Download size={20} color="white" />
                <Text className="text-white font-bold ml-2">Save PDF</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowReportPreview(false)}
              className="mt-3 bg-gray-100 py-3 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Analytics;
