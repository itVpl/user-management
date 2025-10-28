import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

const TermsAndConditions = ({ onAccept, user, viewOnly = false }) => {
  const [currentTermIndex, setCurrentTermIndex] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // 6 actual policies as provided
  const terms = [
    {
      id: 1,
      title: "PRIVACY POLICY",
      content: "WEBSITE TERMS & CONDITIONS AND PRIVACY POLICY\nLast Updated: [Insert Date]\n________________________________________\nPART A: TERMS AND CONDITIONS OF USE\n1. Acceptance of Terms\nBy accessing or using the website www.vpowerlogistics.com (\"Website\"), you agree to be bound by these Terms and Conditions (\"Terms\") and our Privacy Policy. If you do not agree, you must not use the Website.\n\n2. About Us\nThe Website is operated by VE Power Consultancy Private Limited (\"Company\", \"we\", \"us\", or \"our\"), a company incorporated under the Companies Act, 2013 with its registered office at [Insert Address].\n\n3. User Eligibility\nBy using the Website, you represent that you are at least 18 years of age and are competent to enter into a legally binding agreement.\n\n4. Permitted Use\nYou agree to use the Website solely for legitimate purposes related to engaging VE Power Consultancy for logistics, supply chain, and related services. You shall not:\n• Use the Website in violation of applicable laws;\n• Interfere with security or functionality;\n• Upload malware or malicious code;\n• Infringe upon our intellectual property or that of any third party.\n\n5. Account Registration\nCertain areas of the Website may require registration. You agree to provide accurate, current, and complete information and maintain the confidentiality of your credentials.\n\n6. Intellectual Property Rights\nAll content on the Website including logos, graphics, software, data compilations, and other materials is the intellectual property of VE Power Consultancy and protected under applicable IP laws. No part of the Website may be copied, reproduced, or used without our prior written consent.\n\n7. Third-Party Links\nOur Website may contain links to external websites for your convenience. We do not control or endorse such sites and are not responsible for their content, accuracy, or availability.\n\n8. Limitation of Liability\nTo the maximum extent permitted by law, VE Power Consultancy disclaims all liability for any direct, indirect, incidental, consequential, or special damages arising out of your use or inability to use the Website.\n\n9. Indemnity\nYou agree to indemnify and hold harmless VE Power Consultancy, its directors, officers, employees, and affiliates from any claims, losses, or damages arising out of your misuse of the Website or violation of these Terms.\n\n10. Termination of Access\nWe reserve the right to suspend or terminate your access to the Website at any time, without notice, for conduct we believe violates these Terms or is harmful to other users or the Company.\n\n11. Governing Law and Jurisdiction\nThese Terms shall be governed by the laws of India. Courts in Gurugram, Haryana shall have exclusive jurisdiction.\n\n12. Modifications to Terms\nWe reserve the right to modify these Terms at any time. Continued use of the Website post-update will signify acceptance.\n\nPART B: PRIVACY POLICY\nI. Introduction\nThis Privacy Policy explains how VE Power Consultancy collects, uses, stores, discloses, and protects your personal information in compliance with the Information Technology Act, 2000 and applicable data protection laws.\n\nII. Information We Collect\na. We may collect the following information:\nb. Name, email address, phone number, and postal address;\nc. Business/company details;\nd. User credentials and preferences;\ne. Technical data including IP address, browser type, time zone settings, and device information;\nf. Usage data such as pages visited, time spent, and interaction with content.\n\nIII. How We Collect Information\na. We collect information:\nb. When you fill out forms or contact us via the Website;\nc. Through cookies and web analytics tools;\nd. When you subscribe to newsletters or request information;\ne. When you engage with our services.\n\nIV. Use of Information\na. We use the collected data for:\nb. Providing and improving our services;\nc. Responding to user queries;\nd. Internal business analytics and security;\ne. Marketing, promotions, and service updates (only with your consent);\nf. Compliance with legal obligations.\n\nV. Sharing of Information\na. We may share your information:\nb. With our employees and authorized agents for internal business purposes;\nc. With third-party service providers (e.g., payment gateways, analytics partners);\nd. When required by law, legal process, or governmental request;\ne. In case of a merger, acquisition, or sale of business assets.\n\nVI. Cookies\nWe use cookies and similar technologies to improve user experience. Users may choose to disable cookies via browser settings, though some features may be limited.\n\nVII. Data Retention\nWe retain personal data as long as necessary for the purposes stated or as required by law. Once data is no longer needed, it is securely deleted or anonymized.\n\nVIII. Security Practices\nWe implement appropriate technical and organizational measures to protect personal data from unauthorized access, disclosure, alteration, or destruction.\n\nIX. Your Rights\na. Subject to applicable law, you have rights to:\nb. Access, update, or delete your personal data;\nc. Withdraw consent at any time;\nd. Object to direct marketing;\ne. Lodge complaints with a regulatory authority.\n\nX. Third-Party Services\nOur Website may use services such as Google Analytics. Such third-party tools have their own privacy policies which we do not control.\n\nXI. Children's Privacy\nOur services are not intended for children under 18. We do not knowingly collect personal information from minors.\n\nXII. Grievance Redressal\nFor any privacy concerns or complaints, please contact:\nGrievance Officer\nName: [Insert Name]\nEmail: [Insert Email]\nPhone: [Insert Phone Number]\n\nXIII. Changes to this Policy\nWe reserve the right to update this Privacy Policy at any time. Changes will be posted on this page and, where appropriate, notified to you.\n________________________________________\n© VE Power Consultancy Pvt. Ltd. All Rights Reserved."
    },
    {
      id: 2,
      title: "EMPLOYMENT POLICY cum AGREEMENT",
      content: "EMPLOYMENT AGREEMENT\nThis Employment Agreement (\"Agreement\") is made and entered into on this ___ day of __________, 2025, by and between:\nVE Power Consultancy Pvt. Ltd., a company duly incorporated under the Companies Act, 2013, having its principal place of business at Ground Floor, C-14, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122008, hereinafter referred to as the \"Employer\" or the \"Company\" (which expression shall, unless repugnant to the context or meaning thereof, include its successors and permitted assigns),\nAND\nMr./Ms.__________________________, son/daughter of __________________________, residing at __________________________, holder of Aadhar/Passport No. _______________, hereinafter referred to as the \"Employee\" (which expression shall, unless repugnant to the context or meaning thereof, include his/her legal heirs, administrators, executors and representatives).\nThe Company and the Employee are collectively referred to as the \"Parties\" and individually as a \"Party\".\n\nWHEREAS\nA. The Company is engaged in the business of providing comprehensive third-party logistics (3PL) services, with a specialized focus on U.S.-based operations;\nB. The Employee has represented that he/she possesses the necessary qualifications, skills, and experience to perform the duties assigned to the position for which he/she is being employed;\nC. Based on the above representations, the Company desires to employ the Employee, and the Employee agrees to accept such employment on the terms and conditions set forth herein.\n\nNOW, THEREFORE, in consideration of the mutual covenants and undertakings contained herein, and other good and valuable consideration (the sufficiency of which is hereby acknowledged), the Parties agree as follows:\n\n1. POSITION AND COMMENCEMENT\n1.1 The Employee shall be designated as [Insert Designation] and shall report to such reporting authority as may be notified by the Company from time to time.\n1.2 The employment shall commence on [Insert Start Date] (the \"Effective Date\") and shall continue unless terminated earlier in accordance with the provisions herein.\n1.3 The Employee shall be on probation for an initial period of three (3) months (\"Probation Period\"), which may be extended or curtailed at the sole discretion of the Company. Upon satisfactory completion, the employment shall be confirmed in writing.\n\n2. DUTIES AND RESPONSIBILITIES\n2.1 The Employee shall:\na. Devote full working time, attention, and abilities to the business of the Company;\nb. Faithfully and diligently perform such duties as assigned, including support of U.S.-based operations;\nc. Comply with all policies, practices, and procedures of the Company, including those contained in the Company Policy Manual.\n2.2 The Employee shall not, without prior written consent of the Company, directly or indirectly engage in any other business, employment or consultancy.\n\n3. WORK SCHEDULE, SHIFT TIMINGS, ATTENDANCE, AND OVERTIME\n3.1 Work Schedule and Shift Timings\nThe Employee shall perform duties in accordance with the operational requirements of the Company's U.S.-based logistics support functions. Accordingly, the Employee's designated work schedule shall be as follows:\na) Working Days: Monday through Friday of each week;\nb) Shift Hours: 5:30 PM Indian Standard Time (IST) to 2:30 AM IST, aligned with U.S. Eastern Standard Time (EST);\nc) Weekly Off: Saturday and Sunday shall constitute weekly holidays, unless the Employee is expressly scheduled to work on any such day by the reporting manager or authorized personnel of the Company, owing to operational exigencies or client-driven requirements.\nd) The Company reserves the right to modify the Employee's shift timings and workdays based on evolving business needs, provided reasonable notice is given, except in cases of urgent exigencies.\n\n3.2 Attendance Obligations\nThe Employee shall be responsible for accurately and punctually recording daily attendance through the Company's designated Human Resource Management System (HRMS) or any other application as may be notified.\na. A delay exceeding fifteen (15) minutes from the scheduled shift start time, without prior intimation or written approval, shall be considered a late login.\nb. Accumulation of three (3) unapproved late logins within a calendar month shall render the Employee liable to deduction equivalent to one (1) day of salary on Loss of Pay (LOP) basis.\nc. Persistent non-compliance with attendance norms may attract disciplinary action as per Clause 8 of this Agreement.\n\n3.3 Overtime Policy\nThe Company does not encourage routine overtime and expects the Employee to efficiently manage assigned responsibilities within prescribed shift hours. Notwithstanding the foregoing:\na. Any work undertaken beyond scheduled shift hours shall qualify as overtime and may be compensated by either:\ni. Payment as per Company's internal payroll policies, or\nii. Grant of compensatory time-off, subject to the nature and duration of such overtime.\nb. Prior written approval from the reporting manager or such designated authority shall be a mandatory precondition for all claims of overtime, failing which no compensation or adjustment shall be entertained.\nc. The Employee shall cooperate with the Company's internal audit, HR, and compliance teams in maintaining and verifying accurate overtime records.\n\n4. WORK SCHEDULE AND ATTENDANCE\n4.1 The Employee shall observe the following shift timings:\n→ Workdays: Monday to Friday\n→ Shift Hours: 5:30 PM IST to 2:30 AM IST (aligned with U.S. Eastern Time)\n→ Weekends: Saturday and Sunday off unless scheduled for business exigencies\n4.2 Overtime work, if any, shall be compensated only upon prior written approval by the reporting manager.\n4.3 Attendance must be marked through the official HRMS/in-house app. Three (3) unapproved late logins in a calendar month shall constitute one (1) day of Loss of Pay (LOP).\n\n5. LEAVE ENTITLEMENTS\n5.1 Paid Leave (PL): 1.5 days per month, usable within the same quarter. No rollover permitted.\n5.2 Emergency Leave: Permitted with documentary evidence and managerial approval.\n5.3 Leave Without Pay (LWP): Applicable when PL is exhausted or leave is unapproved.\n5.5 The Company shall observe selected U.S. national holidays, as notified in advance via email.\n\n6. COMMUNICATION & CONDUCT\n6.1 English shall be the official language for all communications, both internal and external.\n6.2 Informal chatting and social media usage during work hours are strictly prohibited, except where approved for business needs.\n6.3 All official communications must be via email or CRM; verbal directives shall not be considered binding unless confirmed in writing.\n6.4 Employees shall remain at their designated workstations during shift hours. Unnecessary floor movement is discouraged.\n\n7. DATA SECURITY AND DEVICE USAGE\n7.1 Only Company-issued devices shall be used for client communication and data access.\n7.2 VPN use and login tracking tools are mandatory. Any breach, sharing, or unauthorized forwarding of data will result in immediate termination and FIR.\n\n8. CONFIDENTIALITY & COMPLIANCE\n8.1 The Employee shall sign a separate Non-Disclosure Agreement (NDA), which shall form an integral part of this Agreement.\n8.2 The Employee shall adhere to applicable U.S. compliance standards including FMCSA, DOT, and internal audit protocols of the Company.\n\n9. DISCIPLINARY ACTION\n9.1 Grounds for disciplinary action or termination include but are not limited to:\na. Uninformed or unauthorized absences (especially post-salary credit);\nb. Misrepresentation regarding working hours or off-days;\nc. Repeated agreement violations or non-performance;\nd. Disruptive conduct or insubordination.\n\n10. REMUNERATION AND BENEFITS\n10.1 Salary shall be credited by the 9th day of each month or the next working day.\n10.2 Full & Final settlement shall be processed within forty-five (45) days of exit.\n10.3 No cash advances shall be made unless formally approved by senior management.\n10.4 Perquisites:\n• One-time meal per working day;\n• One-way cab facility or travel allowance, as applicable.\n\n11. EXIT AND TERMINATION\n11.1 This Agreement may be terminated by either Party by providing a written notice of thirty (30) days or salary in lieu thereof.\n11.2 Relieving Letter shall only be issued to employees who:\n(a) Serve the full notice period; or\n(b) Are mutually released by the Company.\n11.3 A Service Certificate shall be issued to all exiting employees reflecting tenure.\n\n12. USE OF IN-HOUSE APPLICATION\n12.1 Use of the Company's proprietary application is mandatory for:\n(a) Attendance logging;\n(b) Leave requests;\n(c) Performance monitoring.\n12.2 Failure to comply may result in:\n• Marking as absent;\n• Delay in leave/incentive approvals;\n• Penalty in performance appraisals.\n\n13. GOVERNING LAW AND JURISDICTION\n13.1 This Agreement shall be governed by and construed in accordance with the laws of India.\n13.2 Any disputes arising out of or in relation to this Agreement shall be subject to the exclusive jurisdiction of the competent courts at Gurugram, Haryana.\n\n14. ENTIRE AGREEMENT\nThis Agreement, along with its annexures, including the Company Policy Manual and the NDA, constitutes the entire agreement between the Parties and supersedes all prior agreements, oral or written.\n\n15. Post-Employment Restrictions\na. Non-Compete Clause:\nThe Employee agrees that for a period of three (3) months immediately following the cessation of their employment with the Company, whether voluntary or involuntary, they shall not:\n• Directly or indirectly join, consult, be employed by, or provide services to any competitor engaged in a similar line of business as VE Power Consultancy Pvt. Ltd.; or\n• Establish or operate any business that offers services substantially similar to those of the Company, whether individually or through any partnership, firm, company, or third party.\n\nb. Non-Solicitation and Confidentiality:\nThe Employee further agrees that during the term of employment and for three (3) months thereafter, they shall not:\n• Solicit, induce, or attempt to solicit any clients, vendors, employees, or business partners of the Company;\n• Disclose, share, or misuse any confidential, proprietary, or sensitive information belonging to the Company, its clients, or affiliates, including but not limited to business processes, pricing, client databases, internal systems, technology, or operational models.\n\nc. Enforcement and Injunctive Relief:\nAny breach of the above obligations shall entitle the Company to seek appropriate legal remedies including but not limited to injunctive relief, damages, and legal action under applicable laws, including Section 27 of the Indian Contract Act, 1872 where permissible.\n\nIN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.\n\nFor VE Power Consultancy Pvt. Ltd.\nAuthorized Signatory: ______________________\nName:\nDesignation:\nDate:\n\nFor Employee\nSignature: ______________________\nName:\nDate:"
    },
    {
      id: 3,
      title: "EMPLOYEE NON-DISCLOSURE AGREEMENT",
      content: "EMPLOYEE NON-DISCLOSURE AGREEMENT\nTHIS AGREEMENT is made on this ___ day of _________, 2025\nBETWEEN\nVE POWER CONSULTANCY PRIVATE LIMITED, a company incorporated under the Companies Act, 1956, having its registered office at Ground Floor, C 14, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122008 (hereinafter \"Employer\", which term includes its successors and permitted assigns),\nAND\n[EMPLOYEE NAME], son/daughter of __________________, residing at ___________________________ (hereinafter \"Employee\", which term includes the Employee's heirs, executors, administrators and permitted assigns).\nEmployer and Employee are hereinafter each a \"Party\" and collectively the \"Parties.\"\n\n1. RECITALS\n1.1 The Employee is or will be employed by the Employer in a position that may grant access to the Employer's trade secrets, confidential business information and proprietary data.\n1.2 The Employer requires that such Confidential Information be held in strict confidence and not be used or disclosed except as authorized.\n\n2. DEFINITIONS\n2.1 \"Confidential Information\" means any non-public information of the Employer, whether or not marked \"confidential,\" including but not limited to:\n• Business plans, forecasts, customer and supplier lists, pricing data, marketing strategies;\n• Technical data, software (source or object code), designs, drawings, prototypes, processes;\n• Financial information, budgets, projections and analyses;\n• Personnel data, organizational structures, compensation details;\n• Any other information the Employer designates as confidential or which Employee should reasonably understand to be confidential.\n2.2 \"Permitted Purpose\" means performance of the Employee's duties for the Employer.\n\n3. EMPLOYEE OBLIGATIONS\n3.1 Non-Disclosure & Non-Use. Employee shall not, during or after employment, use Confidential Information for any purpose other than the Permitted Purpose, nor disclose it to any third party without the Employer's prior written consent.\n3.2 Care & Protection. Employee shall employ at least the same degree of care to protect Confidential Information as the Employee uses to protect the Employee's own confidential information, but in no event less than reasonable care.\n3.3 Limited Access. Employee shall limit access to Confidential Information only to those persons within the Employer's organization who have a need to know in order to perform the Permitted Purpose and who are bound by confidentiality obligations no less restrictive than this Agreement.\n3.4 Return of Materials. Upon termination of employment, or at any time upon request, Employee shall promptly return (or, at the Employer's option, destroy) all documents, electronic files, devices and other materials containing Confidential Information, and certify in writing that all such materials have been returned or destroyed.\n\n4. EXCEPTIONS\nThe obligations above shall not apply to information that Employee can show by written records that it:\na. Was in Employee's possession prior to disclosure by the Employer without any obligation of confidentiality;\nb. Is or becomes publicly available through no act or omission of the Employee;\nc. Is lawfully received from a third party without confidentiality obligations; or\nd. Is independently developed by Employee without use of or reference to the Employer's Confidential Information.\n\n5. TERM AND SURVIVAL\n5.1 Term. This Agreement takes effect on the date first written above and remains in force during employment and for a period of five (5) years thereafter.\n5.2 Survival. Sections 2 (Definitions), 3 (Employee Obligations), 4 (Exceptions), 6 (Remedies), 7 (Miscellaneous) and this Section 5 shall survive termination of this Agreement or Employee's employment.\n\n6. REMEDIES\nEmployee acknowledges that any breach may cause irreparable harm to the Employer for which monetary damages would be inadequate. Accordingly, the Employer shall be entitled to injunctive relief, specific performance and any other remedies at law or in equity, without the necessity of posting bond or proving actual damages.\n\n7. MISCELLANEOUS\n7.1 No License. Nothing herein grants Employee any license in or to any intellectual property of the Employer.\n7.2 Governing Law. This Agreement shall be governed by the laws of India.\n7.3 Jurisdiction. The courts at Bangalore shall have exclusive jurisdiction over any disputes arising hereunder.\n7.4 Severability. If any provision is held invalid, the remainder shall continue in full force.\n7.5 Entire Agreement. This Agreement constitutes the entire understanding and supersedes all prior agreements relating to its subject matter.\n7.6 Amendment. No amendment shall be effective unless in writing and signed by both Parties.\n7.7 Counterparts. This Agreement may be executed in counterparts, each of which is an original, and all constitute one instrument.\n\nIN WITNESS WHEREOF, the Parties have executed this Employee Non-Disclosure Agreement as of the date first above written.\n\nFOR VE POWER CONSULTANCY PVT. LTD.\nBy: _____________________\nName:\nTitle:\nDate:\n\nEMPLOYEE\nSignature: _____________________\nName:\nDate:"
    },
    {
      id: 4,
      title: "LEAVE POLICY",
      content: "LEAVE POLICY\n(Quarterly Use, No Rollover)\n\n1. Objective\nThis Leave Policy has been formulated to ensure optimal operational continuity while allowing employees necessary time off for rest, personal matters, or health-related needs. The policy aims to maintain clarity, fairness, and administrative efficiency in the leave management process.\n\n2. Scope and Applicability\nThis policy is applicable to all full-time employees of V Power Logistics, including those working in support of U.S.-based operations.\n\n3. Leave Entitlement\n3.1 All eligible full-time employees shall accrue 1.5 days of Paid Leave per calendar month, amounting to 4.5 days per quarter.\n3.2 The Paid Leave is of a consolidated nature and may be availed for casual, personal, or medical purposes.\n3.3 The leave entitlement is based on active service within the applicable quarter. Pro-rata adjustments will apply for mid-quarter joiners or leavers.\n\n4. Quarterly Usage and Forfeiture\n4.1 Paid Leaves earned must be utilized within the same quarter in which they accrue.\n4.2 No leave carry-forward shall be permitted to the succeeding quarter.\n4.3 Unused leave will automatically lapse at the end of the respective quarter.\n4.4 Illustration:\n- Q1 (January–March) Leave Entitlement: 4.5 days\n- Leaves not availed by March 31st shall stand forfeited\n\n5. Application and Approval Process\n5.1 Employees shall submit leave requests via the official HRMS portal or email to their Reporting Manager, at least two (2) working days in advance.\n5.2 In the event of emergency leave (including but not limited to medical emergencies or family exigencies), intimation must be made by 10:00 AM on the same day, and supporting documentation may be requested.\n5.3 All leave applications shall be subject to managerial approval, keeping in view business requirements and continuity of operations.\n\n6. Restrictions and Disciplinary Provisions\n6.1 Uninformed or unapproved absence shall be treated as Leave Without Pay (LWP).\n6.2 Recurrent absenteeism, particularly post-payroll dates, or misuse of leave provisions may result in disciplinary proceedings, including warnings or salary deductions.\n6.3 Leave under this policy is non-encashable, non-transferable, and non-carry-forwardable under any circumstances.\n\n7. Operational Considerations\n7.1 The Company reserves the right to decline or restrict leave during peak business periods or designated blackout dates, particularly to support time-sensitive U.S. process cycles.\n7.2 Where employees are required to work on Company-designated holidays, Compensatory Offs (Comp-Offs) may be granted at management's discretion and must be availed within the same quarter.\n\n8. Policy Review and Amendments\n8.1 This policy shall be subject to periodic review by the Human Resources and Legal departments.\n8.2 The Company reserves the right to amend, suspend, or withdraw this policy in whole or in part. Any such changes shall be communicated to employees in writing and shall become effective from the notified date.\n\nIssued By: Human Resources Department\nEffective Date: [Insert Date]\nVersion: 1.0\nApproved By: [Name, Designation]"
    },
    {
      id: 5,
      title: "POSH POLICY",
      content: "VE Power Consultancy Pvt. Ltd. Prevention of Sexual Harassment (PoSH) Policy\n\n1. Introduction and Objective\nVE Power Consultancy Pvt. Ltd. is committed to providing a safe, respectful and dignified work environment for all employees and stakeholders. This policy is framed in accordance with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (\"PoSH Act\") and the Rules thereunder. The PoSH Act was enacted \"to provide protection against sexual harassment of women at workplace and for the prevention and redressal of complaints\". In line with Section 19 of the Act and Rule 13 of the PoSH Rules, the Company hereby adopts this comprehensive internal policy to prohibit, prevent and address sexual harassment. VE Power Consultancy Pvt. Ltd. affirms zero tolerance for any form of sexual harassment or retaliation and will fully comply with all applicable statutory provisions. Employees and third parties (including vendors, contractors, customers and visitors) are expected to adhere to this policy at all times.\n\n2. Scope and Applicability\nThis policy applies to all employees of VE Power Consultancy Pvt. Ltd. (full-time, part-time, contractual, temporary, trainees, interns, etc.) regardless of gender, and extends to all workplaces under the Company's control, including offices, branches, warehouses, vehicles, client or customer sites, and any site visited for business purposes. Under Section 2(q) of the Act, \"workplace\" includes any place visited by an employee arising out of or during the course of employment. This encompasses off-site work-related events (e.g. team dinners, conferences, training, social functions), transportation provided by the Company, and remote-working locations including employees' homes or virtual/online platforms used for work. Any act of harassment of a VE Power Consultancy employee by a third-party (e.g. client, vendor, passenger) in any of these contexts is subject to this policy.\n\nDefinition of Sexual Harassment: For purposes of this policy, \"sexual harassment\" shall be construed in accordance with Section 2(n) of the PoSH Act, which includes any one or more of the following unwelcome acts or behaviour, whether directly or by implication:\n• Physical contact or advances, or demanding sexual favors;\n• Making sexually colored remarks or vulgar jokes/comments of a sexual nature;\n• Showing pornography or any unwelcome visual materials;\n• Any other unwelcome physical, verbal or non-verbal conduct of a sexual nature.\nThese examples are not exhaustive. Circumstances where such conduct creates an intimidating, hostile or offensive environment (including implied threats or unfavorable work assignments conditional on submission to sexual conduct) shall also be deemed harassment.\n\nOther Key Definitions:\n• \"Employee\" includes persons employed directly or through an agent (including contractors, temporary or daily wage workers, interns, volunteers, etc.) for any work in connection with VE Power Consultancy.\n• \"Employer\" means any person responsible for the management or supervision of the workplace; for VE Power Consultancy this refers to the management of the Company.\n• \"Aggrieved Woman\" means any woman, of any age or employment status, who makes a complaint of sexual harassment under this policy (or, where she is unable due to incapacity or death, her legal heir or authorized representative may complain). Although the PoSH Act specifically empowers women, VE Power Consultancy endorses a gender-neutral stance against harassment and will not tolerate harassment of any employee.\n• \"Respondent\" means the person against whom the complaint is filed.\n\n3. Commitment to Prevention\nVE Power Consultancy will ensure that all work environments are free from sexual harassment and that employees are aware of their rights. Management will provide facilities (e.g. complaint forms, private meeting spaces) to support the Internal Complaints Committee (ICC) and will assist in securing attendance of respondents and witnesses. The Company will treat sexual harassment as serious misconduct under the service rules and take appropriate disciplinary action when warranted. In accordance with Section 19(a) and (b) of the Act, the Company will strive to provide a safe working environment for all, and prominently display the penal consequences of sexual harassment at conspicuous places in all workplaces.\n\n4. Internal Complaints Committee (ICC)\nIn compliance with Section 4 of the Act, VE Power Consultancy will constitute an Internal Complaints Committee (\"ICC\") at each workplace (with 10 or more employees) by a written order. The ICC's composition and functioning will fully adhere to the statutory requirements. Key features include:\n• Composition: The ICC will have a minimum of four members. It shall be chaired by a senior-level woman employee (Presiding Officer) at the workplace. At least two other members will be employees who are committed to women's issues and/or have experience in social work or understanding of legal issues related to sexual harassment. One member will be an external person (from an NGO or an expert on gender issues) familiar with the subject of sexual harassment. At least 50% of the ICC members will be women.\n• Tenure: Members of the ICC (including the Presiding Officer) shall hold office for up to three years from the date of appointment. After tenure expiry, new members will be appointed by the employer.\n• Quorum: For any ICC meeting, at least three members (including the Presiding Officer) must be present.\n• Notification: Details of the ICC members (names, contact details) will be officially notified to all employees and to the District Officer as required by law. Replacement of members (due to resignation, transfer or incapacity) will be done promptly, ensuring compliance with Section 4 and Rule 4 of the Rules.\nThe ICC will exercise its powers and duties as prescribed by the Act. It will remain independent and impartial in inquiry, without interference from management or others. The employer shall provide the necessary infrastructure and secretarial support to the ICC for its functioning.\n\n5. Complaint Redressal Mechanism\na) Filing a Complaint: Any aggrieved woman employee or her representative may lodge a written complaint of sexual harassment with the ICC. Complaints should generally be filed within three months from the date of the incident or the last in a series of incidents. The ICC may extend this time limit by up to three months (or beyond) if it finds sufficient cause for delay. Complaints should detail the allegation(s), parties involved, and any evidence or witnesses. If a complaint cannot be made in writing (e.g. due to disability or illiteracy), the Presiding Officer of the ICC shall provide assistance to document it.\n\nb) Conciliation (Optional): Before initiating a formal inquiry, the ICC may, at the written request of the aggrieved employee, attempt conciliation between the parties. No monetary settlement shall be permitted as part of conciliation. If a resolution is reached, the ICC will record it and forward the same to the employer with recommendations. In case of successful conciliation, no further inquiry is required. If conciliation fails or is not opted for, the ICC will proceed with an inquiry.\n\nc) Inquiry Procedure: Upon receipt of a complaint (or after failed conciliation), the ICC will conduct a fair and timely inquiry. The complainant must submit six copies of the complaint along with supporting documents and list of witnesses. The ICC will, within 7 working days of receiving the complaint, send one copy of the complaint to the respondent. The respondent will submit a written reply (with documents and witness list) to the ICC within 10 working days of receipt.\nThe ICC shall commence the inquiry and aim to complete it within 90 days from the date of its initiation. Every inquiry hearing will be attended by all three ICC members (including the Presiding Officer). Both complainant and respondent shall have equal opportunity to present evidence and witnesses. The proceedings will be conducted in accordance with principles of natural justice – the parties may examine and cross-examine witnesses and make written or oral submissions. Neither party is permitted to be represented by legal counsel in the ICC proceedings.\nIf either party fails to appear for three consecutive hearings without valid reason, the ICC may terminate the inquiry and make an ex-parte award (after giving 15 days' notice). At all stages, the ICC will maintain confidentiality of the records and proceedings.\n\nd) Interim Measures: During the pendency of inquiry, the ICC may recommend interim reliefs for the complainant (to prevent further discomfort or professional disadvantage). Such measures may include temporary transfer of the complainant or respondent to another location, granting additional leave to the complainant, restraining the respondent from contacting or supervising the complainant, or other similar measures as deemed appropriate. The employer is expected to act on such interim recommendations promptly.\n\ne) Inquiry Report: Within 10 days of completing the inquiry, the ICC shall submit a detailed report of its findings to the employer (and the District Officer, if applicable). The report will indicate whether allegations were proven or dismissed, summarize evidence, and suggest remedial actions. A copy of the report (without encroaching confidentiality) will be made available to both parties.\n\n6. Disciplinary Action\nIf the ICC concludes that a respondent is guilty of sexual harassment, it will recommend appropriate disciplinary action to the employer. Possible actions include warning, reprimand, formal apology, withholding promotion or pay rise, transfer, suspension, termination of employment, or any other punishment deemed fit. Sexual harassment shall be treated as a serious violation of the Company's code of conduct and service rules. The employer shall act on the ICC's recommendation within 60 days of receiving the report. If the ICC concludes that the complaint is not substantiated, no action will be taken against the respondent. However, the complainant will be informed in writing of the outcome in a fair manner.\n\n7. False or Malicious Complaints\nVE Power Consultancy also recognizes the protection of innocent parties. If the Company determines that a complaint was malicious or false, or that a witness has given false evidence, it may recommend disciplinary action against the complainant or witness under the applicable service rules. Mere inability to substantiate a complaint is not, by itself, evidence of malice. In line with Section 14 of the Act and Rule 14 of the Rules, any person making a complaint in bad faith will be liable to suitable action, up to and including termination of employment.\n\n8. Confidentiality\nAll complaints and inquiries under this policy will be treated with utmost confidentiality. In compliance with Section 16 of the Act, the identity of the complainant, respondent, and witnesses, as well as the contents of the complaint and the inquiry proceedings, shall not be published, disclosed, or made public in any manner. Breach of confidentiality is a serious violation; any ICC member, employer or other person who contravenes Section 16 shall face penalties as per Section 17 of the Act (which may include penalties under service rules or other prescribed penalties). Information may be shared only to the extent necessary with those involved in the investigation and for taking action.\n\n9. Awareness and Training\nVE Power Consultancy will take proactive steps to foster awareness and prevention of sexual harassment. In accordance with Section 19 and Rule 13 of the Act and Rules, the Company shall organize workshops, training sessions and awareness programs at regular intervals for all employees. These programs will cover the legal definition of sexual harassment, prevention strategies, and the rights and responsibilities under this policy. Newly appointed employees and ICC members will receive orientation and training on their roles and procedures. The Company will also display informative posters and notices (including the penal provisions of sexual harassment) at conspicuous places in the workplace.\n\n10. Annual Reporting and Record-Keeping\nThe ICC shall prepare an Annual Report of all complaints received and the actions taken. In compliance with Section 21 of the Act and Rule 14 of the Rules, this report will be submitted to the District Officer within 31st January of the succeeding year. The report will contain details such as number of complaints filed, pending cases, actions recommended and taken, workshops conducted, etc., as prescribed by law. The employer shall maintain records of all complaints, inquiry reports, and related documents. The Company will also include relevant POSH compliance information in its own statutory Annual Report as required by Section 22 of the Act.\n\n11. Review of Policy\nThis policy shall be reviewed at least annually (or as required by law) by the management to ensure that it remains effective and up-to-date. Any amendments to the PoSH Act or Rules will be incorporated promptly. ICC members and management will be apprised of any changes.\n\nLegal Authority: This policy is based on and incorporates the provisions of the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and the POSH Rules, 2013. Key statutory provisions include Sections 3-4, 9, 11-13, 14-16, 19-21, and 29 of the Act, and Rules 3, 4, 13-14 of the Rules. Employees are encouraged to familiarize themselves with these laws and this policy.\n\nThis document serves as an internal compliance manual and is intended for all employees and stakeholders of VE Power Consultancy. Any breach of this policy or the laws it incorporates will result in strict action. VE Power Consultancy reaffirms its commitment to a workplace free of sexual harassment and to the spirit and letter of the law in this regard.\n\n[Authorized Signatory]\n[Name]\n[Designation]\nVE Power Consultancy\nDate:"
    },
    {
      id: 6,
      title: "DISPUTE RESOLUTION POLICY VPower LTD",
      content: "DISPUTE RESOLUTION POLICY\nEffective Date: [Insert Date]\nApproved By: [Managing Director / HR Head / Legal Head]\nVersion: 1.0\n\n1. Objective\nThe purpose of this Dispute Resolution Policy (\"Policy\") is to provide a structured and fair mechanism for resolving disputes that may arise in the course of employment, operations, or commercial dealings involving VE Power Consultancy Pvt. Ltd. (\"Company\"). The Company is committed to resolving all disputes promptly, fairly, confidentially, and in a manner that maintains trust and integrity.\n\n2. Scope\nThis Policy shall apply to:\n• All employees, including permanent, probationary, contractual, part-time, and interns;\n• All consultants, vendors, service providers, clients, and third-party affiliates;\n• Disputes arising from employment, service contracts, vendor agreements, or any other business relationship with the Company.\n\n3. Guiding Principles\nThe following guiding principles shall govern all dispute resolution processes under this Policy:\n• Fairness: Every individual shall be accorded a fair opportunity to present their case.\n• Neutrality: All disputes shall be handled by an impartial authority.\n• Confidentiality: All proceedings shall remain confidential and records shall be secured.\n• Timeliness: Disputes shall be addressed and resolved within defined and reasonable timelines.\n• Non-Retaliation: No adverse action shall be taken against any individual raising a bona fide grievance.\n\n4. Types of Disputes Covered\nThis Policy shall cover:\n• Workplace grievances (e.g., discrimination, harassment, interpersonal conflict)\n• Breach of employment or service agreements\n• Client/vendor/service provider disputes\n• Commercial and contractual disagreements\n• IP or confidentiality breaches (internal/external)\n\n5. Internal Dispute Resolution Procedure (Employees)\n→ Step 1: Informal Resolution\nThe aggrieved party should first attempt to resolve the dispute informally by discussing it directly with the person(s) involved or reporting to the immediate supervisor or HR.\n\n→ Step 2: Formal Written Complaint\nIn the event the issue remains unresolved, a written complaint must be submitted to the Grievance Redressal Committee at hr@vpower-logistics.com within 15 working days from the date of the incident or dispute.\n\n→ Step 3: Internal Review & Resolution\nThe Committee shall acknowledge the complaint within 3 working days, conduct a neutral investigation, and provide both parties an opportunity to be heard. A reasoned decision shall be issued within 30 working days. Interim relief, if necessary, may be granted.\n\n6. External Dispute Resolution (Third Parties / Clients / Vendors)\nIn case of any contractual or commercial dispute with a third party:\na. Negotiation: Initial resolution through mutual discussion and good-faith negotiation within 15 days.\nb. Mediation: If unresolved, the parties may opt for mediation through a mutually agreed neutral mediator.\nc. Arbitration (if provided in the contract):\nIf the dispute remains unresolved after mediation, and if the underlying agreement contains an arbitration clause, the dispute shall be referred to arbitration under the provisions of the Arbitration and Conciliation Act, 1996 (as amended):\n• Arbitral Tribunal: Sole Arbitrator, mutually appointed\n• Seat & Venue: New Delhi, India\n• Language: English\n• Governing Law: Indian law\n\n7. Legal Recourse\nIn absence of a binding arbitration clause or where arbitration is not mutually agreed upon, the parties shall have the right to initiate legal proceedings before the courts having jurisdiction over Gurugram, Haryana, subject to applicable laws.\n\n8. No Retaliation Clause\nThe Company strictly prohibits any form of retaliation, victimization, or adverse consequence against individuals who raise complaints or grievances in good faith. Any such retaliation will be dealt with sternly and may invite disciplinary action.\n\n9. Policy Review & Updates\nThis Policy shall be administered by the Legal and HR Departments and reviewed annually or as required by statutory updates or operational exigencies. Any amendment shall be made with the prior approval of the Board or designated officer.\n\n10. Contact Information:\nGrievance Redressal Officer\nVE Power Consultancy Pvt. Ltd.\nEmail: hr@vpower-logistics.com\nPhone: 9310023990\n\n[Authorized Signatory]\nDesignation\nVE Power Consultancy Pvt. Ltd."
    }
  ];

  const currentTerm = terms[currentTermIndex];
  const isCurrentTermAccepted = acceptedTerms.has(currentTerm.id);
  const allTermsAccepted = acceptedTerms.size === terms.length;

  const handleAcceptCurrentTerm = () => {
    setAcceptedTerms(prev => new Set([...prev, currentTerm.id]));
    
    // Move to next term or complete if all accepted
    if (currentTermIndex < terms.length - 1) {
      setCurrentTermIndex(prev => prev + 1);
    }
  };

  const handleAcceptAllTerms = async () => {
    if (!allTermsAccepted) {
      toast.error("Please accept all terms before proceeding");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.acceptTerms({
        empId: user.empId,
        termsVersion: "1.0"
      });

      if (response.success) {
        toast.success("Terms and conditions accepted successfully!");
        onAccept(response.data);
      } else {
        toast.error("Failed to accept terms. Please try again.");
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      toast.error("Failed to accept terms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentTermIndex > 0) {
      setCurrentTermIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentTermIndex < terms.length - 1) {
      setCurrentTermIndex(prev => prev + 1);
    }
  };

  // If view-only mode, show a different layout
  if (viewOnly) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 text-white p-4">
            <h2 className="text-xl font-medium text-center">Terms and Conditions</h2>
            <p className="text-center text-sm mt-1 opacity-90">
              ✓ You have already accepted all terms
            </p>
          </div>

          {/* Progress */}
          <div className="bg-gray-100 px-4 py-2 text-center text-sm text-gray-600">
            Term {currentTermIndex + 1} of {terms.length}
          </div>

          {/* Term Content */}
          <div className="p-8">
            <h3 className="text-xl font-medium mb-4 text-gray-800">
              {currentTerm.title}
            </h3>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="max-h-96 overflow-y-auto">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {currentTerm.content}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentTermIndex === 0}
                className={`px-4 py-2 rounded-lg text-sm ${
                  currentTermIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                Previous
              </button>

              <div className="flex gap-2">
                {terms.map((term, index) => (
                  <button
                    key={term.id}
                    onClick={() => setCurrentTermIndex(index)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                      currentTermIndex === index
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentTermIndex === terms.length - 1}
                className={`px-4 py-2 rounded-lg text-sm ${
                  currentTermIndex === terms.length - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-medium text-center">Terms and Conditions</h2>
          <p className="text-center text-sm mt-1 opacity-90">
            Please accept all terms to continue
          </p>
        </div>

        {/* Progress */}
        <div className="bg-gray-100 px-4 py-2 text-center text-sm text-gray-600">
          Term {currentTermIndex + 1} of {terms.length}
        </div>

        {/* Term Content */}
        <div className="p-8 flex-1 overflow-y-auto">
          <h3 className="text-xl font-medium mb-4 text-gray-800">
            {currentTerm.title}
          </h3>
          
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="max-h-64 overflow-y-auto">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {currentTerm.content}
              </p>
            </div>
          </div>

          {/* Accept Current Term */}
          <div className="text-center mb-6">
            <button
              onClick={handleAcceptCurrentTerm}
              disabled={isCurrentTermAccepted}
              className={`px-6 py-3 rounded-lg text-sm font-medium ${
                isCurrentTermAccepted
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isCurrentTermAccepted ? '✓ Accepted' : 'Accept This Term'}
            </button>
          </div>

          {/* Accepted Terms Summary */}
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h4 className="text-sm font-medium text-green-800 mb-3">Accepted Terms:</h4>
            <div className="space-y-2">
              {terms.map((term) => (
                <div key={term.id} className="flex items-center text-xs">
                  <span className={`w-4 h-4 rounded-full mr-3 ${
                    acceptedTerms.has(term.id) ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {acceptedTerms.has(term.id) && (
                      <span className="text-white text-xs flex items-center justify-center h-full">✓</span>
                    )}
                  </span>
                  <span className={`${
                    acceptedTerms.has(term.id) ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {term.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentTermIndex === 0}
            className={`px-4 py-2 rounded-lg text-sm ${
              currentTermIndex === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleNext}
              disabled={currentTermIndex === terms.length - 1}
              className={`px-4 py-2 rounded-lg text-sm ${
                currentTermIndex === terms.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Next
            </button>

            <button
              onClick={handleAcceptAllTerms}
              disabled={!allTermsAccepted || loading}
              className={`px-6 py-2 rounded-lg text-sm font-medium ${
                !allTermsAccepted || loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Accepting...' : 'Accept All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
