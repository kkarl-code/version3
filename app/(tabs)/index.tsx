import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Activity, Battery, Calendar, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { getAmmoniaLevelColor, getBatteryLevelColor, formatTime } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';

interface SensorData {
  pigpen_id: string;
  name: string;
  ammonia: number;
  category: string;
  battery: number;
  status: string;
  lastReading: string;
}

interface AlertData {
  alert_id: string;
  message: string;
  time: string;
  severity: string;
}

interface ScheduleData {
  schedule_id: string;
  title: string;
  time: string;
  status: string;
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    fetchDashboardData();

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSensorData(),
        fetchAlerts(),
        fetchSchedules()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorData = async () => {
    try {
      const { data: pigpens, error: pigpensError } = await supabase
        .from('pigpens')
        .select(`
          pigpen_id,
          name,
          sensor_nodes (
            sensor_id,
            status,
            battery_level,
            sensor_readings (
              value_ppm,
              category,
              timestamp
            )
          )
        `);

      if (pigpensError) throw pigpensError;

      const formattedData: SensorData[] = pigpens?.map(pigpen => {
        const sensor = pigpen.sensor_nodes?.[0];
        const latestReading = sensor?.sensor_readings?.[0];
        
        return {
          pigpen_id: pigpen.pigpen_id,
          name: pigpen.name,
          ammonia: latestReading?.value_ppm || 0,
          category: latestReading?.category || 'Low',
          battery: sensor?.battery_level || 0,
          status: sensor?.status || 'offline',
          lastReading: latestReading?.timestamp ? formatTime(latestReading.timestamp) : 'No data'
        };
      }) || [];

      setSensorData(formattedData);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setSensorData([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          alert_id,
          created_at,
          sensor_readings (
            value_ppm,
            category,
            sensor_nodes (
              pigpens (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: true });
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedAlerts: AlertData[] = (data || []).map(alert => {
        const reading = alert.sensor_readings;
        const pigpenName = (reading as any)?.sensor_nodes?.pigpens?.name || 'Unknown';
        const category = reading?.category || 'Unknown';
        const ppm = Number(reading?.value_ppm) || 0;
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )?.[0];
        
        return {
          alert_id: alert.alert_id,
          message: `${category} ammonia level (${ppm} ppm) in ${pigpenName}`,
          ammonia: Number(latestReading?.value_ppm) || 0,
          severity: category === 'Critical' ? 'critical' : 'warning'
        };
      });

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  };

  const fetchSchedules = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('schedule_id, title, due_date, completed')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      const formattedSchedules: ScheduleData[] = (data || []).map(schedule => ({
        schedule_id: schedule.schedule_id,
        title: schedule.title,
        time: formatTime(schedule.due_date),
        status: schedule.completed ? 'completed' : 'due'
      }));

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const criticalCount = sensorData.filter(sensor => sensor.category === 'Critical').length;
  const lowBatteryCount = sensorData.filter(sensor => sensor.battery < 30).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.farmName}>Bantay Farm</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color={Colors.text} />
            {alerts.length > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>

        {/* Status Cards */}
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: criticalCount > 0 ? Colors.critical : Colors.safe }]}>
            <AlertTriangle size={24} color={Colors.white} />
            <Text style={styles.statusNumber}>{criticalCount}</Text>
            <Text style={styles.statusLabel}>Critical Alerts</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: Colors.primary }]}>
            <Activity size={24} color={Colors.white} />
            <Text style={styles.statusNumber}>{sensorData.filter(s => s.status === 'online').length}</Text>
            <Text style={styles.statusLabel}>Active Sensors</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: lowBatteryCount > 0 ? Colors.warning : Colors.safe }]}>
            <Battery size={24} color={Colors.white} />
            <Text style={styles.statusNumber}>{lowBatteryCount}</Text>
            <Text style={styles.statusLabel}>Low Battery</Text>
          </View>
        </View>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {alerts.map((alert) => (
              <View key={alert.alert_id} style={styles.alertCard}>
                <View style={[styles.alertIndicator, { 
                  backgroundColor: alert.severity === 'critical' ? Colors.critical : Colors.warning 
                }]} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>{alert.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sensor Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensor Overview</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading sensor data...</Text>
          ) : sensorData.length === 0 ? (
            <Text style={styles.emptyText}>No sensor data available</Text>
          ) : (
            sensorData.map((sensor) => (
            <View key={sensor.pigpen_id} style={styles.sensorCard}>
              <View style={styles.sensorHeader}>
                <Text style={styles.sensorName}>{sensor.name}</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: sensor.status === 'online' ? Colors.online : 
                                  sensor.status === 'offline' ? Colors.offline : Colors.error 
                }]}>
                  <Text style={styles.statusBadgeText}>{sensor.status}</Text>
                </View>
              </View>
              
              <View style={styles.sensorData}>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Ammonia Level</Text>
                  <View style={styles.dataValue}>
                    <Text style={[styles.dataNumber, { color: getAmmoniaLevelColor(sensor.category) }]}>
                      {sensor.ammonia} ppm
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getAmmoniaLevelColor(sensor.category) }]}>
                      <Text style={styles.categoryText}>{sensor.category}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Battery Level</Text>
                  <View style={styles.batteryContainer}>
                    <View style={styles.batteryBar}>
                      <View style={[styles.batteryFill, { 
                        width: `${sensor.battery}%`,
                        backgroundColor: getBatteryLevelColor(sensor.battery)
                      }]} />
                    </View>
                    <Text style={[styles.batteryText, { color: getBatteryLevelColor(sensor.battery) }]}>
                      {sensor.battery}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )))}
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Calendar size={20} color={Colors.primary} />
          </View>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled tasks for today</Text>
          ) : (
            schedules.map((schedule) => (
            <View key={schedule.schedule_id} style={styles.scheduleCard}>
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                <View style={[styles.scheduleStatus, { 
                  backgroundColor: schedule.status === 'completed' ? Colors.safe : Colors.warning 
                }]}>
                  <Text style={styles.scheduleStatusText}>
                    {schedule.status === 'completed' ? 'Completed' : 'Due'}
                  </Text>
                </View>
              </View>
            </View>
          )))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  farmName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.critical,
  },
  statusGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  alertIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sensorCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
    textTransform: 'capitalize',
  },
  sensorData: {
    gap: 12,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dataValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryBar: {
    width: 60,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 4,
  },
  batteryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scheduleTime: {
    marginRight: 16,
  },
  scheduleTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  scheduleContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTitle: {
    fontSize: 14,
    color: Colors.text,
  },
  scheduleStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scheduleStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});