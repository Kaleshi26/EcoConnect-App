import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WCAnalyticsProps {
  onBackToDashboard?: () => void;
}

const Analytics: React.FC<WCAnalyticsProps> = ({ onBackToDashboard }) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

  // Chart data for grouped bars
  const chartData = [
    { month: 'Jan', plastic: 15, glass: 10, metal: 8, organic: 5 },
    { month: 'Feb', plastic: 18, glass: 12, metal: 10, organic: 6 },
    { month: 'Mar', plastic: 12, glass: 8, metal: 6, organic: 4 },
    { month: 'Apr', plastic: 15, glass: 10, metal: 7, organic: 5 },
  ];

  const wasteTypes = [
    { name: 'Plastic', color: '#10B981' },
    { name: 'Glass', color: '#3B82F6' },
    { name: 'Metal', color: '#6B7280' },
    { name: 'Organic', color: '#F59E0B' },
  ];

  const maxWeight = 20; // Max value for scaling
  const chartHeight = 160;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      Alert.alert('Search', `Searching for: ${searchQuery}`);
    } else {
      Alert.alert('Search', 'Please enter a search term');
    }
  };

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodSelector(false);
  };

  return (

    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          {onBackToDashboard && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onBackToDashboard}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Waste Collection Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search and Filter Row */}
        <View style={styles.controlsRow}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput 
                placeholder="Search analytics..."
                style={styles.searchInput}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
            </View>
          </View>

        {/* Time Period Selector */}

          <View style={styles.selectorContainer}>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowPeriodSelector(!showPeriodSelector)}
            >
              <Text style={styles.selectorText}>{selectedPeriod}</Text>
              <Ionicons 
                name={showPeriodSelector ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#6B7280" 
              />
            </TouchableOpacity>
            {showPeriodSelector && (
              <View style={styles.periodDropdown}>
                {['Weekly', 'Monthly', 'Yearly'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodOption,
                      selectedPeriod === period && styles.selectedPeriodOption
                    ]}
                    onPress={() => handlePeriodSelect(period)}
                  >
                    <Text style={[
                      styles.periodOptionText,
                      selectedPeriod === period && styles.selectedPeriodOptionText
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

                 {/* Total Waste Overview */}
         <View style={styles.totalWasteCard}>
           <View style={styles.totalWasteHeader}>
             <View style={styles.totalWasteIcon}>
               <Ionicons name="analytics" size={32} color="#3B82F6" />
             </View>
             <View style={styles.totalWasteInfo}>
               <Text style={styles.totalWasteLabel}>Total Waste Collected</Text>
               <Text style={styles.totalWasteAmount}>150 kg</Text>
               <Text style={styles.totalWasteSubtext}>This month</Text>
             </View>
           </View>
         </View>

        {/* Waste Type Breakdown */}
        <View style={styles.wasteBreakdownCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Waste Type Breakdown</Text>
            <Text style={styles.cardSubtitle}>Current period distribution</Text>
          </View>
          
          <View style={styles.wasteGrid}>
            <View style={[styles.wasteCard, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.wasteAmount}>40kg</Text>
              <Text style={styles.wasteLabel}>Glass</Text>
              <Text style={styles.wastePercentage}>27%</Text>
            </View>
            <View style={[styles.wasteCard, { backgroundColor: '#10B981' }]}>
              <Text style={styles.wasteAmount}>60kg</Text>
              <Text style={styles.wasteLabel}>Plastic</Text>
              <Text style={styles.wastePercentage}>40%</Text>
            </View>
            <View style={[styles.wasteCard, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.wasteAmount}>30kg</Text>
              <Text style={styles.wasteLabel}>Metal</Text>
              <Text style={styles.wastePercentage}>20%</Text>
            </View>
            <View style={[styles.wasteCard, { backgroundColor: '#6B7280' }]}>
              <Text style={styles.wasteAmount}>20kg</Text>
              <Text style={styles.wasteLabel}>Organic</Text>
              <Text style={styles.wastePercentage}>13%</Text>
            </View>
          </View>
        </View>

                          {/* Chart Card */}
         <View style={styles.chartCard}>
           <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>Waste Over Time</Text>
             <Text style={styles.cardSubtitle}>Amount (KG)</Text>
           </View>
           
           {/* Legend */}
           <View style={styles.legendContainer}>
             {wasteTypes.map((type, index) => (
               <View key={index} style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: type.color }]} />
                 <Text style={styles.legendText}>{type.name}</Text>
               </View>
             ))}
           </View>
           
           <View style={styles.chartWrapper}>
             {/* Y-axis labels */}
             <View style={styles.yAxisContainer}>
               <Text style={styles.yAxisLabel}>20kg</Text>
               <Text style={styles.yAxisLabel}>15kg</Text>
               <Text style={styles.yAxisLabel}>10kg</Text>
               <Text style={styles.yAxisLabel}>5kg</Text>
               <Text style={styles.yAxisLabel}>0kg</Text>
             </View>
             
             {/* Chart Area */}
             <View style={styles.chartArea}>
               {/* Grid lines */}
               <View style={styles.gridContainer}>
                 <View style={styles.gridLine} />
                 <View style={styles.gridLine} />
                 <View style={styles.gridLine} />
                 <View style={styles.gridLine} />
                 <View style={styles.gridLine} />
               </View>
               
               {/* Grouped Bars */}
               <View style={styles.barsContainer}>
                 {chartData.map((monthData, monthIndex) => (
                   <View key={monthIndex} style={styles.monthGroup}>
                     <View style={styles.barsGroup}>
                       {wasteTypes.map((type, typeIndex) => {
                         const value = monthData[type.name.toLowerCase() as keyof typeof monthData] as number;
                         const barHeight = (value / maxWeight) * chartHeight;
              return (

                           <View key={typeIndex} style={styles.barWrapper}>
                             <View 
                               style={[
                                 styles.groupedBar,
                                 { 
                                   height: barHeight,
                                   backgroundColor: type.color,
                                 }
                               ]}
                             />
                           </View>
              );
            })}

                     </View>
                     <Text style={styles.monthLabel}>{monthData.month}</Text>
                   </View>
                 ))}
               </View>
             </View>
           </View>
         </View>


        {/* Action Buttons */}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="download" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Download Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="share" size={20} color="#3B82F6" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Share Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E293B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  selectorContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  periodDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 120,
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedPeriodOption: {
    backgroundColor: '#F0F9FF',
  },
  periodOptionText: {
    fontSize: 16,
    color: '#64748B',
  },
  selectedPeriodOptionText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
     totalWasteCard: {
     backgroundColor: 'white',
     borderRadius: 20,
     padding: 24,
     marginBottom: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 4,
   },
   totalWasteHeader: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   totalWasteIcon: {
     width: 64,
     height: 64,
     borderRadius: 32,
     backgroundColor: '#F0F9FF',
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 20,
   },
   totalWasteInfo: {
     flex: 1,
   },
   totalWasteLabel: {
     fontSize: 16,
     color: '#64748B',
     fontWeight: '500',
     marginBottom: 8,
   },
   totalWasteAmount: {
     fontSize: 36,
     fontWeight: '800',
     color: '#1E293B',
     marginBottom: 4,
     letterSpacing: -0.5,
   },
   totalWasteSubtext: {
     fontSize: 14,
     color: '#94A3B8',
     fontWeight: '500',
   },
     wasteBreakdownCard: {
     backgroundColor: 'white',
     borderRadius: 20,
     padding: 24,
     marginBottom: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 4,
   },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  wasteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wasteCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wasteAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  wasteLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginBottom: 2,
  },
  wastePercentage: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
     chartCard: {
     backgroundColor: 'white',
     borderRadius: 20,
     padding: 24,
     marginBottom: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 4,
   },
     legendContainer: {
     flexDirection: 'row',
     justifyContent: 'center',
     marginBottom: 20,
     gap: 20,
   },
   legendItem: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
   },
   legendDot: {
     width: 12,
     height: 12,
     borderRadius: 6,
   },
   legendText: {
     fontSize: 12,
     color: '#64748B',
     fontWeight: '500',
   },
   chartWrapper: {
     flexDirection: 'row',
     height: 220,
     backgroundColor: '#F8FAFC',
     borderRadius: 12,
     padding: 16,
     borderWidth: 1,
     borderColor: '#E2E8F0',
   },
   yAxisContainer: {
     width: 45,
     justifyContent: 'space-between',
     alignItems: 'flex-end',
     paddingBottom: 20,
     paddingRight: 8,
   },
   yAxisLabel: {
     fontSize: 10,
     color: '#94A3B8',
     fontWeight: '500',
     textAlign: 'right',
   },
   chartArea: {
     flex: 1,
     position: 'relative',
   },
   gridContainer: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 20,
     justifyContent: 'space-between',
   },
   gridLine: {
     height: 1,
     backgroundColor: '#E2E8F0',
     width: '100%',
   },
   barsContainer: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-end',
     height: 180,
     paddingBottom: 20,
     paddingHorizontal: 10,
   },
   monthGroup: {
     alignItems: 'center',
     minWidth: 60,
   },
   barsGroup: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     gap: 1,
     marginBottom: 8,
   },
   barWrapper: {
     justifyContent: 'flex-end',
     height: 160,
   },
   groupedBar: {
     width: 12,
     borderRadius: 2,
     minHeight: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
     elevation: 1,
   },
   monthLabel: {
     fontSize: 11,
     color: '#64748B',
     fontWeight: '600',
     textAlign: 'center',
   },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default Analytics;

