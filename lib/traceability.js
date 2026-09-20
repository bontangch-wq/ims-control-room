export const TRACE_CHAIN=['Requirement','Process','Risk','Control','Evidence','Monitoring','Audit / Finding','CAPA','Effectiveness Verification','Management Review','Improvement']

export const TRACE_EXPECTATIONS={
 'Standar dan Persyaratan':['implements','satisfies'],
 'Risk & Opportunity':['controls','monitors'],
 'Document & Record Control':['evidences','implements'],
 'Inspection & Monitoring':['monitors','identifies'],
 'Audit & Assessment':['identifies','results_in'],
 'Incident, NCR & CAPA':['corrects','verifies'],
 'Management Review':['reviews','improves'],
 'Improvement & Lessons Learned':['improves']
}

export const TRACE_RELATIONS=[['implements','Implements'],['satisfies','Satisfies Requirement'],['controls','Controls Risk'],['evidences','Provides Evidence'],['monitors','Monitors'],['identifies','Identifies Finding'],['results_in','Results In'],['corrects','Corrects'],['verifies','Verifies Effectiveness'],['reviews','Management Reviews'],['improves','Drives Improvement'],['relates_to','Related To']]

export const TRACE_TARGETS={implements:['Business Process','Document & Record Control','Operational Control'],satisfies:['Standar dan Persyaratan','Legal & Compliance'],controls:['Operational Control','Document & Record Control'],evidences:['Document & Record Control','Inspection & Monitoring'],monitors:['Inspection & Monitoring','Objectives & KPI','Performance & Analytics'],identifies:['Audit & Assessment','Inspection & Monitoring'],results_in:['Incident, NCR & CAPA'],corrects:['Incident, NCR & CAPA','Operational Control'],verifies:['Inspection & Monitoring','Audit & Assessment'],reviews:['Management Review'],improves:['Improvement & Lessons Learned']}
