export type Availability = {
    morning: boolean
    afternoon: boolean 
    night: boolean
  }
  
  export type AvailabilityEntry = {
    date: Date
    availability: Availability
  }