import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { checkPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
    const permCheck = await checkPermission("email-builder", "view");
    if (!permCheck.authorized) {
        return permCheck.response;
    }
    const user = permCheck.user;

    await connectDB();

    const [campaigns, getdefaultcampaigns] = await Promise.all([
        EmailCampaign.find({ companyId: user.companyId })
            .sort({ createdAt: -1 })
            .lean(),
        EmailCampaign.find({ isDefault: true })
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    const data = [...getdefaultcampaigns, ...campaigns];
    return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
    const permCheck = await checkPermission("email-builder", "create");
    if (!permCheck.authorized) {
        return permCheck.response;
    }
    const user = permCheck.user;

    try {
        const body = await req.json();
        console.log("POST /api/email-campaigns body:", JSON.stringify(body).substring(0, 200) + "...");
        const { name, subject, content, design, reminders, status, templateId } = body;

        console.log('[API] Creating email campaign with templateId:', templateId);

        if (!subject) {
            return NextResponse.json({ error: "Subject is required" }, { status: 400 });
        }
        if (!content) {
            return NextResponse.json({ error: "Content (HTML) is required" }, { status: 400 });
        }

        await connectDB();

        const campaign = await EmailCampaign.create({
            createdBy: user.userId,
            companyId: user.companyId,
            name: name || subject,
            subject,
            html: content,
            design: design, // Schema.Types.Mixed handles objects
            reminders: reminders || [],
            status: status || "draft",
            templateId: templateId
        });

        console.log('[API] Campaign created with templateId:', campaign.templateId);

        return NextResponse.json({ success: true, data: campaign }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating email campaign:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


//update design & html

export async function PUT(req: NextRequest) {
    let data = [
        {
            id: "699edae6050a83e2bf7d2298",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%; font-size: 18px; text-align: center;\">Custom Message</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Hi {{firstname}},<br/><br/>This is a custom message from our team.<br/><br/>Best Regards,<br/>CRM Team</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Off Time Request Confirmation</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",

        },
        {
            id: "699edae6050a83e2bf7d2299",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%; font-size: 18px; text-align: center;\">Custom Message</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Hi {{firstname}},<br/><br/>This is a custom message from our team.<br/><br/>Best Regards,<br/>CRM Team</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Off Time Request Cancellation</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },
        {
            id: "699edae6050a83e2bf7d229b",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Welcome to <strong>CRM</strong> - Your Partner in CRM!</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Dear {{firstname}} {{lastname}},<br>Welcome to the CRM Family!&nbsp;</p>\n<p style=\"line-height: 140%;\">We are excited to help you keep your home sparkling clean. Whether it&rsquo;s a one-time clean or recurring service, we&rsquo;re here to make life easier for you.&nbsp;If you have any questions or want to book your first clean, feel free to reach out to us at 888-438-1781 or&nbsp;<a rel=\"noopener\" href=\"mailto:sales@CRMcleaning\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Im1haWx0bzpzYWxlc0BncmVlbmZyb2djbGVhbmluZyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\">sales@CRMcleaning.com</a><br>Thank you again for choosing CRM. We look forward to serving you!<br>Best Regards, Brian &amp; Jaime Owners, CRM Cleaning<br><a rel=\"noopener\" href=\"http://CRMcleaning.com\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHA6Ly9ncmVlbmZyb2djbGVhbmluZy5jb20iLCJ0YXJnZXQiOiJfYmxhbmsifX0=\">CRMcleaning.com</a></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Your Schedule for Today</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },
        {
            id: "699edae6050a83e2bf7d229c",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Welcome to <strong>CRM</strong> - Your Partner in CRM!</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Dear {{firstname}} {{lastname}},<br>Welcome to the CRM Family!&nbsp;</p>\n<p style=\"line-height: 140%;\">We are excited to help you keep your home sparkling clean. Whether it&rsquo;s a one-time clean or recurring service, we&rsquo;re here to make life easier for you.&nbsp;If you have any questions or want to book your first clean, feel free to reach out to us at 888-438-1781 or&nbsp;<a rel=\"noopener\" href=\"mailto:sales@CRMcleaning\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Im1haWx0bzpzYWxlc0BncmVlbmZyb2djbGVhbmluZyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\">sales@CRMcleaning.com</a><br>Thank you again for choosing CRM. We look forward to serving you!<br>Best Regards, Brian &amp; Jaime Owners, CRM Cleaning<br><a rel=\"noopener\" href=\"http://CRMcleaning.com\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHA6Ly9ncmVlbmZyb2djbGVhbmluZy5jb20iLCJ0YXJnZXQiOiJfYmxhbmsifX0=\">CRMcleaning.com</a></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Reminder: Your Upcoming Service</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },
        {
            id: "699edae6050a83e2bf7d229a",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Welcome to <strong>CRM</strong> - Your Partner in CRM!</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Dear {{firstname}} {{lastname}},<br>Welcome to the CRM Family!&nbsp;</p>\n<p style=\"line-height: 140%;\">We are excited to help you keep your home sparkling clean. Whether it&rsquo;s a one-time clean or recurring service, we&rsquo;re here to make life easier for you.&nbsp;If you have any questions or want to book your first clean, feel free to reach out to us at 888-438-1781 or&nbsp;<a rel=\"noopener\" href=\"mailto:sales@CRMcleaning\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Im1haWx0bzpzYWxlc0BncmVlbmZyb2djbGVhbmluZyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\">sales@CRMcleaning.com</a><br>Thank you again for choosing CRM. We look forward to serving you!<br>Best Regards, Brian &amp; Jaime Owners, CRM Cleaning<br><a rel=\"noopener\" href=\"http://CRMcleaning.com\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHA6Ly9ncmVlbmZyb2djbGVhbmluZy5jb20iLCJ0YXJnZXQiOiJfYmxhbmsifX0=\">CRMcleaning.com</a></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Reset Your Password</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },
        {
            id: "699edae6050a83e2bf7d229a",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Welcome to <strong>CRM</strong> - Your Partner in CRM!</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Dear {{firstname}} {{lastname}},<br>Welcome to the CRM Family!&nbsp;</p>\n<p style=\"line-height: 140%;\">We are excited to help you keep your home sparkling clean. Whether it&rsquo;s a one-time clean or recurring service, we&rsquo;re here to make life easier for you.&nbsp;If you have any questions or want to book your first clean, feel free to reach out to us at 888-438-1781 or&nbsp;<a rel=\"noopener\" href=\"mailto:sales@CRMcleaning\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Im1haWx0bzpzYWxlc0BncmVlbmZyb2djbGVhbmluZyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\">sales@CRMcleaning.com</a><br>Thank you again for choosing CRM. We look forward to serving you!<br>Best Regards, Brian &amp; Jaime Owners, CRM Cleaning<br><a rel=\"noopener\" href=\"http://CRMcleaning.com\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHA6Ly9ncmVlbmZyb2djbGVhbmluZy5jb20iLCJ0YXJnZXQiOiJfYmxhbmsifX0=\">CRMcleaning.com</a></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Confirm Your Account</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },
        {
            id: "699edae6050a83e2bf7d229d",
            "design": {
                "counters": {
                    "u_column": 6,
                    "u_row": 4,
                    "u_content_image": 1,
                    "u_content_text": 6,
                    "u_content_html": 3,
                    "u_content_social": 2
                },
                "body": {
                    "id": "EsAHMuY_P8",
                    "rows": [
                        {
                            "id": "0rES3_aOT7",
                            "cells": [
                                1
                            ],
                            "columns": [
                                {
                                    "id": "_xftQ2jfJy",
                                    "contents": [
                                        {
                                            "id": "tA8B8PAp3l",
                                            "type": "image",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "src": {
                                                    "url": "https://th.bing.com/th/id/OIG3.fOX5uS1eTrA0W465Krnz?w=270&h=270&c=6&r=0&o=5&cb=defcachec2&pid=ImgGn",
                                                    "width": 100,
                                                    "height": 100,
                                                    "filename": "1752815630730-Logo.bd75d8af6c21c8a70441.png",
                                                    "contentType": "image/png",
                                                    "size": 43852,
                                                    "dynamic": true
                                                },
                                                "textAlign": "center",
                                                "altText": "",
                                                "action": {
                                                    "name": "web",
                                                    "values": {
                                                        "href": "",
                                                        "target": "_blank"
                                                    }
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_image_1",
                                                    "htmlClassNames": "u_content_image"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "pending": false,
                                                "width": "100px"
                                            }
                                        },
                                        {
                                            "id": "1TfErJg9Pm",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "18px",
                                                "textAlign": "justify",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_1",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Welcome to <strong>CRM</strong> - Your Partner in CRM!</p>"
                                            }
                                        },
                                        {
                                            "id": "Wj_JPIzH2s",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontFamily": {
                                                    "label": "Global Font",
                                                    "value": "inherit"
                                                },
                                                "fontSize": "15px",
                                                "textAlign": "left",
                                                "lineHeight": "140%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_2",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 140%;\">Dear {{firstname}} {{lastname}},<br>Welcome to the CRM Family!&nbsp;</p>\n<p style=\"line-height: 140%;\">We are excited to help you keep your home sparkling clean. Whether it&rsquo;s a one-time clean or recurring service, we&rsquo;re here to make life easier for you.&nbsp;If you have any questions or want to book your first clean, feel free to reach out to us at 888-438-1781 or&nbsp;<a rel=\"noopener\" href=\"mailto:sales@CRMcleaning\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Im1haWx0bzpzYWxlc0BncmVlbmZyb2djbGVhbmluZyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\">sales@CRMcleaning.com</a><br>Thank you again for choosing CRM. We look forward to serving you!<br>Best Regards, Brian &amp; Jaime Owners, CRM Cleaning<br><a rel=\"noopener\" href=\"http://CRMcleaning.com\" target=\"_blank\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHA6Ly9ncmVlbmZyb2djbGVhbmluZy5jb20iLCJ0YXJnZXQiOiJfYmxhbmsifX0=\">CRMcleaning.com</a></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_1",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center",
                                    "customPosition": [
                                        "50%",
                                        "50%"
                                    ]
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_1",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        },
                        {
                            "id": "QK_Bb8b0DJ",
                            "cells": [
                                1,
                                1
                            ],
                            "columns": [
                                {
                                    "id": "kJC9UOwemv",
                                    "contents": [
                                        {
                                            "id": "dK4UE09Ka8",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "15px",
                                                "color": "#18181b",
                                                "textAlign": "left",
                                                "lineHeight": "150%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "hideDesktop": false,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_4",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 150%;\">Contact</p>\n<p style=\"line-height: 150%;\">888-438-1781</p>\n<p style=\"line-height: 150%;\">7171 Alvarado Rd # 205, La Mesa, CA 91942, United States</p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_2",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                },
                                {
                                    "id": "CxiSiTQY7G",
                                    "contents": [
                                        {
                                            "id": "LGU5ZtgwJ5",
                                            "type": "social",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "icons": {
                                                    "iconType": "circle-black",
                                                    "icons": [
                                                        {
                                                            "name": "Facebook",
                                                            "url": "https://www.facebook.com/CRMhousecleaning/"
                                                        },
                                                        {
                                                            "name": "LinkedIn",
                                                            "url": "https://www.instagram.com/CRMcleaning/"
                                                        },
                                                        {
                                                            "name": "Yelp",
                                                            "url": "https://www.yelp.com/biz/green-frog-house-cleaning-san-diego-2"
                                                        }
                                                    ]
                                                },
                                                "align": "center",
                                                "iconSize": 32,
                                                "spacing": 6,
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_social_2",
                                                    "htmlClassNames": "u_content_social"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false
                                            }
                                        },
                                        {
                                            "id": "PyxtaQYTSD",
                                            "type": "text",
                                            "values": {
                                                "containerPadding": "10px",
                                                "anchor": "",
                                                "fontSize": "14px",
                                                "textAlign": "left",
                                                "lineHeight": "130%",
                                                "linkStyle": {
                                                    "inherit": true,
                                                    "linkColor": "#0000ee",
                                                    "linkHoverColor": "#0000ee",
                                                    "linkUnderline": true,
                                                    "linkHoverUnderline": true
                                                },
                                                "displayCondition": null,
                                                "_styleGuide": null,
                                                "_meta": {
                                                    "htmlID": "u_content_text_6",
                                                    "htmlClassNames": "u_content_text"
                                                },
                                                "selectable": true,
                                                "draggable": true,
                                                "duplicatable": true,
                                                "deletable": true,
                                                "hideable": true,
                                                "locked": false,
                                                "text": "<p style=\"line-height: 130%;\"><span style=\"color: rgb(24, 24, 27); line-height: 18.2px;\">&copy; 2025 <a rel=\"noopener\" href=\"https://CRMcleaning.com/\" target=\"_blank\" style=\"color: rgb(24, 24, 27);\" data-u-link-value=\"eyJuYW1lIjoid2ViIiwiYXR0cnMiOnsiaHJlZiI6Int7aHJlZn19IiwidGFyZ2V0Ijoie3t0YXJnZXR9fSJ9LCJ2YWx1ZXMiOnsiaHJlZiI6Imh0dHBzOi8vZ3JlZW5mcm9nY2xlYW5pbmcuY29tLyIsInRhcmdldCI6Il9ibGFuayJ9fQ==\"><strong>CRM</strong></a> All Rights Reserved</span></p>"
                                            }
                                        }
                                    ],
                                    "values": {
                                        "backgroundColor": "#ffffff",
                                        "padding": "0px",
                                        "borderRadius": "0px",
                                        "_meta": {
                                            "htmlID": "u_column_4",
                                            "htmlClassNames": "u_column"
                                        },
                                        "deletable": true,
                                        "locked": false
                                    }
                                }
                            ],
                            "values": {
                                "displayCondition": null,
                                "columns": false,
                                "_styleGuide": null,
                                "backgroundColor": "",
                                "columnsBackgroundColor": "",
                                "backgroundImage": {
                                    "url": "",
                                    "fullWidth": true,
                                    "repeat": "no-repeat",
                                    "size": "custom",
                                    "position": "center"
                                },
                                "padding": "0px",
                                "anchor": "",
                                "hideDesktop": false,
                                "_meta": {
                                    "htmlID": "u_row_2",
                                    "htmlClassNames": "u_row"
                                },
                                "selectable": true,
                                "draggable": true,
                                "duplicatable": true,
                                "deletable": true,
                                "hideable": true,
                                "locked": false
                            }
                        }
                    ],
                    "headers": [],
                    "footers": [],
                    "values": {
                        "_styleGuide": null,
                        "popupPosition": "center",
                        "popupWidth": "600px",
                        "popupHeight": "auto",
                        "borderRadius": "10px",
                        "contentAlign": "center",
                        "contentVerticalAlign": "center",
                        "contentWidth": "500px",
                        "fontFamily": {
                            "label": "Arial",
                            "value": "arial,helvetica,sans-serif"
                        },
                        "textColor": "#000000",
                        "popupBackgroundColor": "#FFFFFF",
                        "popupBackgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "cover",
                            "position": "center"
                        },
                        "popupOverlay_backgroundColor": "rgba(0, 0, 0, 0.1)",
                        "popupCloseButton_position": "top-right",
                        "popupCloseButton_backgroundColor": "#DDDDDD",
                        "popupCloseButton_iconColor": "#000000",
                        "popupCloseButton_borderRadius": "0px",
                        "popupCloseButton_margin": "0px",
                        "popupCloseButton_action": {
                            "name": "close_popup",
                            "attrs": {
                                "onClick": "document.querySelector('.u-popup-container').style.display = 'none';"
                            }
                        },
                        "backgroundColor": "#F7F8F9",
                        "preheaderText": "",
                        "linkStyle": {
                            "body": true,
                            "linkColor": "#0000ee",
                            "linkHoverColor": "#0000ee",
                            "linkUnderline": true,
                            "linkHoverUnderline": true
                        },
                        "backgroundImage": {
                            "url": "",
                            "fullWidth": true,
                            "repeat": "no-repeat",
                            "size": "custom",
                            "position": "center"
                        },
                        "_meta": {
                            "htmlID": "u_body",
                            "htmlClassNames": "u_body"
                        }
                    }
                },
                "schemaVersion": 21
            },
            "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head>\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n  <table style=\"border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%\" cellpadding=\"0\" cellspacing=\"0\">\n  <tbody>\n  <tr style=\"vertical-align: top\"><td style=\"word-break: break-word;border-collapse: collapse !important;vertical-align: top\">\n  <div style=\"padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;\">\n    <h1 style=\"color: #6366f1;\">Welcome to CRM!</h1>\n    <p style=\"font-size: 16px;\">This is a system-generated email.</p>\n    <p style=\"font-size: 14px; color: #666;\">You can edit this design via the Email Builder in your dashboard.</p>\n  </div>\n  </td></tr></tbody></table></body></html>",
        },

    ]

    await connectDB();

    const bulkOps = data.map((item: any) => ({
        updateOne: {
          filter: { _id: item.id },
          update: {
            $set: {
              design: item.design,
              html: item.html,
            },

          },
          upsert: true,
          new: true,
        },
      }));
      
      const result = await EmailCampaign.bulkWrite(bulkOps);
    return NextResponse.json({ success: true, data: result });
}